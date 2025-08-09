/*  settings.component.ts
    ───────────────────────────────────────────────────────────── */

import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { KEYCLOAK_EVENT_SIGNAL, KeycloakEventType, typeEventArgs, ReadyArgs } from 'keycloak-angular';
import Keycloak from 'keycloak-js';

import { forkJoin } from 'rxjs';

import { ThemeService } from '../theme.service';
import { NotificationService } from '../services/notification.service';

import {
  BudgetRequestDTO,
  SavingsGoalRequestDTO,
  CategoryResponseDTO,
  BinanceCredentialDTO,
} from '../api/dtos';

import { CategoryService } from './category.service';
import { SettingsService } from './settings.service';

declare global { interface Window { OneSignalDeferred?: any[]; } }
function withOneSignal(cb: (os: any) => void) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(cb);
}

interface BudgetRow { categoryId: number; categoryName: string; amount: number; selected?: boolean; }
interface NewBudgetRow { categoryId: number | null; amount: number; isExisting?: boolean; }

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {

  readonly themes = ['light', 'dark'] as const;
  theme: 'light' | 'dark' = 'light';
  prefsChanged = false;

  readonly currencies = ['EUR', 'USD'] as const;
  currency: 'EUR' | 'USD' = 'EUR';

  userName = '';
  userEmail = '';

  existingBudgets: BudgetRow[] = [];
  selectedBudgetIds: number[] = [];
  budgetSearch = '';
  budgetPage = 0;
  readonly budgetSize = 5;
  totalBudgets = 0;

  newBudgetRows: NewBudgetRow[] = [{ categoryId: null, amount: 0 }];

  savingsGoal = { amount: 0, targetDate: '' };
  goalChanged = false;

  categories: CategoryResponseDTO[] = [];

  binanceApiKey = '';
  binanceSecretKey = '';
  hasBinanceCreds = false;

  private readonly keycloak = inject(Keycloak);
  private readonly keycloakSignal = inject(KEYCLOAK_EVENT_SIGNAL);

  constructor(
    private themeService: ThemeService,
    private settingsApi: SettingsService,
    private categoryApi: CategoryService,
    private notifications: NotificationService
  ) {
    effect(() => {
      const ev = this.keycloakSignal();
      if (ev.type === KeycloakEventType.Ready && typeEventArgs<ReadyArgs>(ev.args)) {
        this.keycloak.loadUserProfile().then(p => {
          this.userName = p.username ?? 'Unknown';
          this.userEmail = p.email ?? 'no-email@unknown';
        });
      }
    });
  }

  ngOnInit(): void {
    this.theme = this.themeService.initTheme();
    const savedCur = localStorage.getItem('user-currency') as 'EUR' | 'USD' | null;
    if (savedCur && this.currencies.includes(savedCur)) { this.currency = savedCur; }

    this.categoryApi.listAll().subscribe({
      next: r => {
        if (r.success) {
          this.categories = r.data;
          this.loadExistingBudgets();
        } else {
          this.notifications.notify(r.message, 'error');
        }
      },
      error: () => this.notifications.notify('Failed to load categories', 'error'),
    });

    this.loadSavingsGoal();
    this.loadBinanceCredentials();
  }

  loadExistingBudgets(): void {
    this.settingsApi.getBudgets(this.budgetPage, this.budgetSize).subscribe({
      next: r => {
        if (!r.success) { return this.notifications.notify(r.message, 'error'); }

        const page = r.data;
        this.totalBudgets = page.total;

        this.existingBudgets = page.items
          .map(b => ({
            categoryId: b.categoryId,
            categoryName: this.findCategoryName(b.categoryId),
            amount: b.amount,
            selected: false,
          }))
          .filter(b => b.categoryName.toLowerCase().includes(this.budgetSearch.toLowerCase()));

        this.selectedBudgetIds = [];
      },
      error: () => this.notifications.notify('Failed to load budgets', 'error'),
    });
  }

  onBudgetToggle(row: BudgetRow, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    row.selected = checked;

    if (checked) {
      this.selectedBudgetIds.push(row.categoryId);
    } else {
      this.selectedBudgetIds = this.selectedBudgetIds.filter(id => id !== row.categoryId);
    }
  }

  deleteSelectedBudgets(): void {
    if (!this.selectedBudgetIds.length) { return; }

    this.settingsApi.deleteBudgets(this.selectedBudgetIds).subscribe({
      next: r => {
        this.notifications.notify(r.message, r.success ? 'success' : 'error');
        if (r.success) { this.loadExistingBudgets(); }
      },
      error: () => this.notifications.notify('Failed to delete budgets', 'error'),
    });
  }

  onBudgetSearch(term: string): void { this.budgetSearch = term; this.budgetPage = 0; this.loadExistingBudgets(); }
  prevBudgetPage(): void { if (this.budgetPage > 0) { this.budgetPage--; this.loadExistingBudgets(); } }
  nextBudgetPage(): void { if (this.budgetPage + 1 < this.totalPages) { this.budgetPage++; this.loadExistingBudgets(); } }

  addNewRow(): void { this.newBudgetRows.push({ categoryId: null, amount: 0 }); }
  removeNewRow(i: number): void { this.newBudgetRows.splice(i, 1); }

  onCategoryPicked(row: NewBudgetRow): void {
    if (row.categoryId == null) { return; }
    row.isExisting = !!this.existingBudgets.find(b => b.categoryId === row.categoryId);
  }

  saveNewBudgets(): void {
    const dtos: BudgetRequestDTO[] = this.newBudgetRows
      .filter(r => r.categoryId != null && r.amount != null)
      .map(r => ({ categoryId: r.categoryId!, amount: r.amount! }));

    if (!dtos.length) { return; }

    const existingIds = this.existingBudgets.map(b => b.categoryId);
    const toCreate = dtos.filter(d => !existingIds.includes(d.categoryId));
    const toPatch = dtos.filter(d => existingIds.includes(d.categoryId));

    const calls = [
      ...(toCreate.length ? [this.settingsApi.createBudgets(toCreate)] : []),
      ...(toPatch.length ? [this.settingsApi.updateBudgets(toPatch)] : []),
    ];

    if (!calls.length) { return; }

    forkJoin(calls).subscribe({
      next: results => {
        const failed = results.find(r => !r.success);
        if (failed) {
          this.notifications.notify(failed.message || 'Some budgets failed to save', 'error');
        } else {
          this.notifications.notify('Budgets saved successfully', 'success');
        }
        this.newBudgetRows = [{ categoryId: null, amount: 0 }];
        this.loadExistingBudgets();
      },
      error: () => this.notifications.notify('Failed to save budgets', 'error'),
    });
  }

  loadSavingsGoal(): void {
    this.settingsApi.getSavingsGoal().subscribe({
      next: r => {
        if (r.success) {
          const g = r.data;
          this.savingsGoal = { amount: g.targetAmt, targetDate: this.toInputDate(new Date(g.targetDate)) };
        }
      },
    });
  }

  saveGoal(): void {
    const dto: SavingsGoalRequestDTO = {
      targetAmt: this.savingsGoal.amount,
      targetDate: new Date(this.savingsGoal.targetDate),
    };

    this.settingsApi.upsertSavingsGoal(dto).subscribe({
      next: r => {
        this.notifications.notify(r.message, r.success ? 'success' : 'error');
        if (r.success) {
          const g = r.data;
          this.savingsGoal = { amount: g.targetAmt, targetDate: this.toInputDate(new Date(g.targetDate)) };
          this.goalChanged = false;
        }
      },
      error: () => this.notifications.notify('Failed to save savings goal', 'error'),
    });
  }

  deleteGoal(): void {
    this.settingsApi.deleteSavingsGoal().subscribe({
      next: r => {
        this.notifications.notify(r.message, r.success ? 'success' : 'error');
        if (r.success) {
          this.savingsGoal = { amount: 0, targetDate: this.toInputDate(new Date()) };
          this.goalChanged = false;
        }
      },
      error: () => this.notifications.notify('Failed to delete savings goal', 'error'),
    });
  }

  savePrefs(): void {
    this.themeService.setTheme(this.theme);
    localStorage.setItem('user-currency', this.currency);
    this.prefsChanged = false;
    this.notifications.notify('Preferences saved', 'success');
  }

  private loadBinanceCredentials(): void {
    this.settingsApi.getBinanceCredentials().subscribe({
      next: r => {
        if (r.success && r.data) {
          this.binanceApiKey = r.data.apiKey;
          this.binanceSecretKey = r.data.secretKey;
          this.hasBinanceCreds = true;
        }
      },
      error: () => this.notifications.notify('Failed to load Binance credentials', 'error'),
    });
  }

  saveBinanceCredentials(): void {
    const dto: BinanceCredentialDTO = { apiKey: this.binanceApiKey, secretKey: this.binanceSecretKey };

    this.settingsApi.upsertBinanceCredentials(dto).subscribe({
      next: r => {
        this.notifications.notify(r.message, r.success ? 'success' : 'error');
        if (r.success) { this.hasBinanceCreds = true; }
      },
      error: () => this.notifications.notify('Failed to save Binance credentials', 'error'),
    });
  }

  deleteBinanceCredentials(): void {
    this.settingsApi.deleteBinanceCredentials().subscribe({
      next: r => {
        this.notifications.notify(r.message, r.success ? 'success' : 'error');
        if (r.success) {
          this.binanceApiKey = '';
          this.binanceSecretKey = '';
          this.hasBinanceCreds = false;
        }
      },
      error: () => this.notifications.notify('Failed to delete Binance credentials', 'error'),
    });
  }

  get totalPages(): number { return Math.ceil(this.totalBudgets / this.budgetSize) || 1; }
  get canSaveNewBudgets(): boolean { return this.newBudgetRows.some(r => r.categoryId != null); }

  private findCategoryName(id: number): string { return this.categories.find(c => c.id === id)?.name ?? ''; }
  private toInputDate(d: Date): string { return d.toISOString().slice(0, 10); }

  logout(): void {
    withOneSignal(os => os.logout());

    this.keycloak.logout({ redirectUri: window.location.origin });
  }
}
