import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


import { ThemeService } from '../theme.service';
import { NotificationService } from '../services/notification.service';

import {
  BudgetRequestDTO,
  SavingsGoalRequestDTO,
  CategoryResponseDTO,
  BinanceCredentialDTO
} from '../api/dtos';
import { KEYCLOAK_EVENT_SIGNAL, KeycloakEventType, typeEventArgs, ReadyArgs } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { CategoryService } from './category.service';
import { SettingsService } from './settings.service';
import { forkJoin } from 'rxjs';
import { RouterLink, RouterModule } from '@angular/router';

interface BudgetRow { categoryId: number; categoryName: string; amount: number; selected?: boolean; }
interface NewBudgetRow { categoryId: number | null; amount: number; isExisting?: boolean; }

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  themes = ['light', 'dark'] as const;
  theme: 'light' | 'dark' = 'light';
  prefsChanged = false;

  userName = '';
  userEmail = '';

  currencies = ['EUR', 'USD'] as const;
  currency = 'EUR';

  existingBudgets: BudgetRow[] = [];
  selectedBudgetIds: number[] = [];

  budgetSearch = '';
  budgetPage = 0;
  budgetSize = 5;
  totalBudgets = 0;

  newBudgetRows: NewBudgetRow[] = [{ categoryId: null, amount: 0 }];

  savingsGoal = { amount: 0, targetDate: '' as string };
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
      const e = this.keycloakSignal();
      if (e.type === KeycloakEventType.Ready && typeEventArgs<ReadyArgs>(e.args)) {
        this.keycloak.loadUserProfile()
          .then(p => {
            this.userName = p.username ?? 'Unknown';
            this.userEmail = p.email ?? 'no-email@unknown';
          });
      }
    });
  }

  ngOnInit() {
    this.theme = this.themeService.initTheme();
    const saved = localStorage.getItem('user-currency');
    if (saved && this.currencies.includes(saved as any)) {
      this.currency = saved as any;
    }

    this.categoryApi.listAll().subscribe({
      next: resp => {
        if (resp.success) {
          this.categories = resp.data;
          this.loadExistingBudgets();
        } else {
          this.notifications.notify(resp.message, 'error');
        }
      },
      error: () => this.notifications.notify('Failed to load categories', 'error')
    });

    this.loadSavingsGoal();
    this.loadBinanceCredentials();
  }

  loadExistingBudgets() {
    this.settingsApi.getBudgets(this.budgetPage, this.budgetSize).subscribe({
      next: resp => {
        if (!resp.success) {
          return this.notifications.notify(resp.message, 'error');
        }
        const page = resp.data;
        this.totalBudgets = page.total;
        this.existingBudgets = page.items
          .map(b => ({
            categoryId: b.categoryId,
            categoryName: this.findCategoryName(b.categoryId),
            amount: b.amount,
            selected: false     
          }))
          .filter(b =>
            b.categoryName
              .toLowerCase()
              .includes(this.budgetSearch.toLowerCase())
          );
        this.selectedBudgetIds = [];
      },
      error: () => this.notifications.notify('Failed to load budgets', 'error')
    });
  }

  onBudgetToggle(row: BudgetRow, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    row.selected = checked;
    if (checked) {
      this.selectedBudgetIds.push(row.categoryId);
    } else {
      this.selectedBudgetIds =
        this.selectedBudgetIds.filter(id => id !== row.categoryId);
    }
  }

  deleteSelectedBudgets() {
    if (!this.selectedBudgetIds.length) return;
    this.settingsApi.deleteBudgets(this.selectedBudgetIds).subscribe({
      next: resp => {
        this.notifications.notify(resp.message, resp.success ? 'success' : 'error');
        if (resp.success) {
          this.loadExistingBudgets();
        }
      },
      error: () => this.notifications.notify('Failed to delete budgets', 'error')
    });
  }

  onBudgetSearch(term: string) {
    this.budgetSearch = term;
    this.budgetPage = 0;
    this.loadExistingBudgets();
  }

  prevBudgetPage() {
    if (this.budgetPage > 0) {
      this.budgetPage--;
      this.loadExistingBudgets();
    }
  }
  nextBudgetPage() {
    if (this.budgetPage + 1 < this.totalPages) {
      this.budgetPage++;
      this.loadExistingBudgets();
    }
  }

  addNewRow() {
    this.newBudgetRows.push({ categoryId: null, amount: 0 });
  }
  removeNewRow(i: number) {
    this.newBudgetRows.splice(i, 1);
  }

  loadSavingsGoal() {
    this.settingsApi.getSavingsGoal().subscribe({
      next: resp => {
        if (resp.success) {
          const g = resp.data;
          this.savingsGoal = {
            amount: g.targetAmt,
            targetDate: this.toInputDate(new Date(g.targetDate))
          };
        }
      },
    });
  }

  saveGoal() {
    const dto: SavingsGoalRequestDTO = {
      targetAmt: this.savingsGoal.amount,
      targetDate: new Date(this.savingsGoal.targetDate)
    };
    this.settingsApi.upsertSavingsGoal(dto).subscribe({
      next: resp => {
        if (resp.success) {
          const g = resp.data;
          this.savingsGoal = {
            amount: g.targetAmt,
            targetDate: this.toInputDate(new Date(g.targetDate))
          };
          this.goalChanged = false;
          this.notifications.notify(resp.message, 'success');
        } else {
          this.notifications.notify(resp.message, 'error');
        }
      },
      error: () => this.notifications.notify('Failed to save savings goal', 'error')
    });
  }

  savePrefs() {
    this.themeService.setTheme(this.theme);
    localStorage.setItem('user-currency', this.currency);
    this.prefsChanged = false;
    this.notifications.notify('Preferences saved', 'success');
  }

  onCategoryPicked(row: NewBudgetRow) {
    if (row.categoryId == null) return;

    const already = this.existingBudgets.find(b => b.categoryId === row.categoryId);
    row.isExisting = !!already;
  }

  saveNewBudgets() {
    const dtos: BudgetRequestDTO[] = this.newBudgetRows
      .filter(r => r.categoryId != null && r.amount != null)
      .map(r => ({ categoryId: r.categoryId!, amount: r.amount! }));

    const existingIds = this.existingBudgets.map(b => b.categoryId);

    const toCreate = dtos.filter(d => !existingIds.includes(d.categoryId));
    const toPatch = dtos.filter(d => existingIds.includes(d.categoryId));

    const calls = [
      ...(toCreate.length ? [this.settingsApi.createBudgets(toCreate)] : []),
      ...(toPatch.length ? [this.settingsApi.updateBudgets(toPatch)] : []),
    ];

    if (!calls.length) return;

    forkJoin(calls).subscribe({
      next: (resps) => {
        resps.forEach(r =>
          this.notifications.notify(r.message, r.success ? 'success' : 'error')
        );
        this.newBudgetRows = [{ categoryId: null, amount: 0 }];
        this.loadExistingBudgets();
      },
      error: () => {
        this.notifications.notify('Failed to save budgets', 'error');
      }
    });
  }

  deleteGoal() {
    this.settingsApi.deleteSavingsGoal().subscribe({
      next: resp => {
        if (resp.success) {
          this.savingsGoal = { amount: 0, targetDate: this.toInputDate(new Date()) };
          this.goalChanged = false;
          this.notifications.notify(resp.message, 'success');
        } else {
          this.notifications.notify(resp.message, 'error');
        }
      },
      error: () => {
        this.notifications.notify('Failed to delete savings goal', 'error');
      }
    });
  }

  private loadBinanceCredentials() {
    this.settingsApi.getBinanceCredentials().subscribe({
      next: resp => {
        if (resp.success && resp.data) {
          this.binanceApiKey = resp.data.apiKey;
          this.binanceSecretKey = resp.data.secretKey;
          this.hasBinanceCreds = true;
        }
      },
      error: () => this.notifications.notify('Failed to load Binance credentials', 'error')
    });
  }

  saveBinanceCredentials() {
    const dto: BinanceCredentialDTO = {
      apiKey: this.binanceApiKey,
      secretKey: this.binanceSecretKey
    };
    this.settingsApi.upsertBinanceCredentials(dto).subscribe({
      next: resp => {
        this.notifications.notify(resp.message, resp.success ? 'success' : 'error');
        if (resp.success) this.hasBinanceCreds = true;
      },
      error: () => this.notifications.notify('Failed to save Binance credentials', 'error')
    });
  }

  deleteBinanceCredentials() {
    this.settingsApi.deleteBinanceCredentials().subscribe({
      next: resp => {
        this.notifications.notify(resp.message, resp.success ? 'success' : 'error');
        if (resp.success) {
          this.binanceApiKey = '';
          this.binanceSecretKey = '';
          this.hasBinanceCreds = false;
        }
      },
      error: () => this.notifications.notify('Failed to delete Binance credentials', 'error')
    });
  }

  get totalPages(): number {
    return Math.ceil(this.totalBudgets / this.budgetSize) || 1;
  }

  get canSaveNewBudgets(): boolean {
    return this.newBudgetRows.some(r => r.categoryId != null);
  }

  private findCategoryName(id: number): string {
    return this.categories.find(c => c.id === id)?.name ?? '';
  }

  private toInputDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
