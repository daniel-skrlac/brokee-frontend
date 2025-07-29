import { Component, OnInit, ViewChild, ElementRef, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import Tesseract from 'tesseract.js';

import { HomeService } from './home.service';
import { CategoryService } from '../settings/category.service';
import { NotificationService } from '../services/notification.service';

import {
  TxResponseDTO,
  QuickTxRequestDTO,
  CategoryResponseDTO,
  BudgetResponseDTO
} from '../api/dtos';
import {
  KEYCLOAK_EVENT_SIGNAL,
  KeycloakEventType,
  typeEventArgs,
  ReadyArgs
} from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { RouterLink, RouterModule } from '@angular/router';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule, ZXingScannerModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  themes = ['light', 'dark'] as const;
  theme: 'light' | 'dark' = "light";

  chartLoading = false;
  chartError: string | null = null;

  userName = '';
  today = new Date();

  balance = 0;
  totalBudget = 0;
  budgetUsedPercent = 0;
  upcomingCount = 0;

  viewMode: 'byday' | 'daily' | 'monthly' = 'byday';
  selectedDay = new Date();
  chartData!: ChartData<'line', number[], string>;
  chartOptions: ChartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true }
    }
  };

  loadingChart = true;

  recentTx: TxResponseDTO[] = [];

  categories: CategoryResponseDTO[] = [];

  showQuickModal = false;
  quickTx: QuickTxRequestDTO = {
    amount: 0,
    type: 'E',
    txTime: new Date(),
    categoryId: null!
  };

  showQrModal = false;
  qrText: string | null = null;
  extractedPrice: number | null = null;
  qrCategoryId: number | null = null;

  @ViewChild('cashVideo') cashVideo!: ElementRef<HTMLVideoElement>;
  showCashModal = false;
  recognizedValue: number | null = null;
  cashType: 'E' | 'I' = 'E';
  ocrIntervalId: any;
  ocrRunning = false;
  allowedFormats = [BarcodeFormat.QR_CODE];

  private readonly keycloak = inject(Keycloak);
  private readonly keycloakSignal = inject(KEYCLOAK_EVENT_SIGNAL);
  private themeService = inject(ThemeService);

  constructor(
    private homeApi: HomeService,
    private categoryApi: CategoryService,
    private notifications: NotificationService
  ) {
    effect(() => {
      const e = this.keycloakSignal();
      if (e.type === KeycloakEventType.Ready && typeEventArgs<ReadyArgs>(e.args)) {
        this.keycloak.loadUserProfile()
          .then(p => this.userName = p.username ?? 'Unknown');
      }
    });
  }

  ngOnInit() {
    this.categoryApi.listAll().subscribe(r => {
      if (r.success) this.categories = r.data;
    });

    this.loadBalance();
    this.loadRecent();
    this.updateChart();
    this.loadBudgetSummary();
    this.loadUpcomingCount();

    this.theme = this.themeService.initTheme();
  }

  private loadBalance() {
    this.homeApi.getBalance().subscribe(r => {
      if (r.success) this.balance = r.data;
      else this.notifications.notify(r.message, 'error');
    });
  }

  private loadRecent() {
    this.homeApi.getRecent(5).subscribe(r => {
      if (r.success) this.recentTx = r.data;
    });
  }

  private loadBudgetSummary() {
    this.homeApi.getAllBudgets().subscribe(bR => {
      if (!bR.success) {
        return;
      }

      const all = bR.data.items as BudgetResponseDTO[];

      const budgetedCategoryIds = all.filter(b => b.amount > 0).map(b => b.categoryId);
      this.totalBudget = all.reduce((sum, b) => sum + b.amount, 0);

      const monthStart = this.toIsoTimestamp(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
      const lastDay = new Date(this.today.getFullYear(), this.today.getMonth() + 1, 0);
      lastDay.setHours(23, 59, 59, 999);
      const monthEnd = this.toIsoTimestamp(lastDay);

      this.homeApi.getByDateRange(monthStart, monthEnd).subscribe(tR => {
        if (!tR.success) {
          return;
        }

        const txs = tR.data;
        const spent = txs
          .filter(tx => tx.type === 'E' && budgetedCategoryIds.includes(tx.categoryId))
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        this.budgetUsedPercent = this.totalBudget > 0
          ? Math.round((spent / this.totalBudget) * 100)
          : 0;
      });
    });
  }

  private loadUpcomingCount() {
    const today = new Date();
    const todayStr = this.toInputDate(today);

    // end of month as a Date, then format
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const endStr = this.toInputDate(endOfMonth);

    this.homeApi.getUpcomingBills(todayStr, endStr)
      .subscribe(r => {
        if (!r.success) return;
        this.upcomingCount = r.data.filter(p =>
          new Date(p.dueDate) >= today
        ).length;
      });
  }

  toggleView(m: 'byday' | 'daily' | 'monthly') {
    this.viewMode = m; this.updateChart();
  }

  updateChart() {
    this.loadingChart = true;
    this.chartError = null;

    if (this.viewMode === 'byday') {
      const start = this.toLocalIso(this.selectedDay, 0, 0);
      const end = this.toLocalIso(this.selectedDay, 23, 59);

      this.homeApi.getByDateRange(start, end).subscribe(r => {
        if (!r.success) return;

        const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        const net = labels.map((_, h) =>
          r.data
            .filter(tx => new Date(tx.txTime).getHours() === h)
            .reduce((sum, tx) =>
              tx.type === 'E' ? sum - tx.amount : sum + tx.amount
              , 0)
        );

        const data = net.map(Math.abs);
        const colors = net.map(n => n < 0 ? '#dc3545' : '#4a90e2');

        this.chartData = {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1
          }]
        };
        this.loadingChart = false;
      });

    } else if (this.viewMode === 'daily') {
      this.homeApi.getDailyGraph(7).subscribe(r => {
        if (!r.success) return;

        const entries = Object.entries(r.data) as [string, number][];
        const labels = entries.map(([day]) => day);
        const net = entries.map(([, val]) => val);

        const data = net.map(Math.abs);
        const colors = net.map(n => n < 0 ? '#dc3545' : '#4a90e2');

        this.chartData = {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1
          }]
        };
        this.loadingChart = false;
      });

    } else {
      const year = this.today.getFullYear();
      this.homeApi.getMonthlyGraph(year).subscribe(r => {
        if (!r.success) return;

        const entries = Object.entries(r.data) as [string, number][];
        const labels = entries.map(([mon]) => mon);
        const net = entries.map(([, val]) => val);

        const data = net.map(Math.abs);
        const colors = net.map(n => n < 0 ? '#dc3545' : '#4a90e2');

        this.chartData = {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1
          }]
        };
        this.loadingChart = false;
      });
    }
  }

  openQuick() {
    this.quickTx = { amount: 0, type: 'E', txTime: new Date(), categoryId: null! };
    this.showQuickModal = true;
  }
  saveQuick() {
    this.homeApi.quickAdd(this.quickTx).subscribe(r => {
      this.notifications.notify(r.message, r.success ? 'success' : 'error');
      if (r.success) {
        this.showQuickModal = false;
        this.loadBalance(); this.loadRecent(); this.updateChart();
      }
    });
  }

  openQr() {
    this.qrText = null;
    this.extractedPrice = null;
    this.qrCategoryId = this.categories.find(c => c.name === 'Groceries')?.id ?? null;
    this.showQrModal = true;
  }

  onQrResult(text: string) {
    this.qrText = text;

    const iznMatch = /[?&]izn=([0-9]+,[0-9]{1,2})/.exec(text);
    if (iznMatch) {
      this.extractedPrice = parseFloat(iznMatch[1].replace(',', '.'));
      return;
    }

    const m = /price\s*[:=]\s*([0-9]+(?:\.[0-9]{1,2})?)/i.exec(text);
    this.extractedPrice = m ? parseFloat(m[1]) : null;
  }

  saveQr() {
    if (this.extractedPrice == null || this.qrCategoryId == null) return;
    const dto: QuickTxRequestDTO = {
      amount: this.extractedPrice,
      type: 'E',
      txTime: new Date(),
      categoryId: this.qrCategoryId
    };
    this.homeApi.quickAdd(dto).subscribe(r => {
      this.notifications.notify(r.message, r.success ? 'success' : 'error');
      if (r.success) {
        this.showQrModal = false;
        this.loadBalance(); this.loadRecent(); this.updateChart();
      }
    });
  }

  restartOCR() {
    this.recognizedValue = null;
    clearInterval(this.ocrIntervalId);
    this.ocrIntervalId = setInterval(() => this.captureOCR(), 100);
  }

  openCash() {
    this.recognizedValue = null;
    this.cashType = 'E';
    this.showCashModal = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => this.cashVideo.nativeElement.srcObject = s)
      .then(() => this.ocrIntervalId = setInterval(() => this.captureOCR(), 100));
  }

  private async captureOCR() {
    const vid = this.cashVideo.nativeElement;
    if (!vid.videoWidth || !vid.videoHeight || this.ocrRunning) return;
    this.ocrRunning = true;
    const c = document.createElement('canvas');
    c.width = vid.videoWidth; c.height = vid.videoHeight;
    c.getContext('2d')!.drawImage(vid, 0, 0);
    try {
      const { data } = await Tesseract.recognize(c, 'eng');
      const txt = data.text.replace(/\s+/g, ' ');
      const m = /([0-9]{2,3}(?:\.[0-9]{1,2})?)/.exec(txt);
      if (m) { this.recognizedValue = parseFloat(m[1]); clearInterval(this.ocrIntervalId); }
    } catch { }
    finally { this.ocrRunning = false; }
  }

  saveCash() {
    if (this.recognizedValue == null) return;
    const dto: QuickTxRequestDTO = {
      amount: this.recognizedValue,
      type: this.cashType,
      txTime: new Date(),
      categoryId: null!
    };
    this.homeApi.quickAdd(dto).subscribe(r => {
      this.notifications.notify(r.message, r.success ? 'success' : 'error');
      if (r.success) { this.closeCash(); this.loadBalance(); this.loadRecent(); this.updateChart(); }
    });
  }

  closeCash() {
    clearInterval(this.ocrIntervalId);
    const s = this.cashVideo.nativeElement.srcObject as MediaStream;
    s.getTracks().forEach(t => t.stop());
    this.showCashModal = false;
  }

  onDayChange(value: string) {
    this.selectedDay = new Date(value);
    this.updateChart();
  }

  toInputDate(d: Date) { return d.toISOString().slice(0, 10); }

  toIsoTimestamp(d: Date) {
    return d.toISOString();
  }

  getCategoryName(id: number) {
    return this.categories.find(c => c.id === id)?.name ?? '—';
  }

  private toLocalIso(d: Date, hours: number, minutes: number): string {
    const dt = new Date(d);
    dt.setHours(hours, minutes, 0, 0);

    const pad = (n: number) => n.toString().padStart(2, '0');

    const offsetMin = -dt.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const hOff = pad(Math.floor(absMin / 60));
    const mOff = pad(absMin % 60);

    const year = dt.getFullYear();
    const month = pad(dt.getMonth() + 1);
    const day = pad(dt.getDate());
    const hr = pad(dt.getHours());
    const min = pad(dt.getMinutes());

    return `${year}-${month}-${day}T${hr}:${min}:00${sign}${hOff}:${mOff}`;
  }

}
