import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  NgZone,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartOptions } from 'chart.js';

import * as L from 'leaflet';
import 'leaflet.markercluster';

import {
  LocationDTO,
  FullPortfolioDTO,
} from '../api/dtos';
import { TrackingService } from './tracking.service';
import { BinanceService } from './binance.service';
import { ThemeService } from '../theme.service';

export const MyDivIcon = L.divIcon({
  html      : '📍',
  className : 'my-marker',
  iconSize  : [24, 24],
  iconAnchor: [12, 12],
});

(L.Marker as any).prototype.options.icon = MyDivIcon;

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.scss'],
})
export class TrackingComponent implements OnInit, AfterViewInit {

  readonly themes = ['light', 'dark'] as const;
  theme: 'light' | 'dark' = 'light';
  private readonly themeService = inject(ThemeService);

  userCurrency = localStorage.getItem('user-currency') ?? 'EUR';

  hasBinance = false;
  showBinanceModal = false;
  portfolio: FullPortfolioDTO | null = null;

  spendingIncomeData!: ChartData<'bar', number[], string>;
  spendingIncomeOpts: ChartOptions<'bar'> = {
    responsive: true,
    scales: { y: { beginAtZero: true } },
  };
  funnelData!: ChartData<'bar', number[], string>;
  funnelOpts: ChartOptions<'bar'> = {
    responsive: true,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
  };

  savingsRate = 0;
  gaugeData!: ChartData<'doughnut', number[], string>;
  gaugeOpts: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { display: false } },
    cutout: '75%',
  };

  readonly rollingDays = 30;
  rollingAvgData!: ChartData<'line', number[], string>;
  rollingAvgOpts: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio,
    plugins: { legend: { display: false } },
    elements: {
      line: { tension: 0.3, borderWidth: 2 },
      point: {
        radius: 4,
        backgroundColor: '#4a90e2',
        borderColor: '#fff',
        borderWidth: 2,
        hoverRadius: 6,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true },
    },
  };
  @ViewChild('rollingAvgChart', { static: false }) rollingAvgChart?: BaseChartDirective;
  heatmapData: { date: string; level: 1 | 2 | 3 | 4 | 5 }[] = [];

  categoryBarData!: ChartData<'bar', number[], string>;
  categoryBarOpts: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } },
  };

  topLocations: LocationDTO[] = [];
  currentLocIdx = 0;
  private map?: L.Map;
  private marker?: L.Marker;
  @ViewChild('mapEl', { static: false }) mapEl?: ElementRef<HTMLDivElement>;

  private readonly svc = inject(TrackingService);
  private readonly binance = inject(BinanceService);
  private readonly zone = inject(NgZone);

  ngOnInit(): void {
    this.theme = this.themeService.initTheme();

    const year = new Date().getFullYear();
    this.svc.getSpendingVsIncome(year).subscribe(({ data = [] }) => {
      this.spendingIncomeData = {
        labels: data.map(d => d.month!),
        datasets: [
          { label: 'Spending', data: data.map(d => +d.expenses), backgroundColor: '#4a90e2' },
          { label: 'Income', data: data.map(d => +d.income), backgroundColor: '#7ed321' },
        ],
      };

      const totalSp = data.reduce((s, d) => s + +d.expenses, 0);
      const totalIn = data.reduce((s, d) => s + +d.income, 0);
      this.savingsRate = totalIn ? Math.round(((totalIn - totalSp) / totalIn) * 100) : 0;

      this.gaugeData = {
        labels: ['Saved', 'Used'],
        datasets: [{ data: [this.savingsRate, 100 - this.savingsRate], backgroundColor: ['#50e3c2', '#e0e0e0'] }],
      };
      this.funnelData = {
        labels: ['Income', 'Saved', 'Spent'],
        datasets: [{ data: [totalIn, totalIn - totalSp, totalSp], backgroundColor: ['#4a90e2', '#50e3c2', '#f5a623'] }],
      };
    });

    this.svc.getTopLocations(3).subscribe(({ data = [] }) => {
      this.topLocations = data;
      this.currentLocIdx = 0;
      setTimeout(() => this.tryInitMap());
    });

    this.svc.getDailyExpenses(this.rollingDays).subscribe(({ data = {} }) => {
      const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
      const values = entries.map(([, v]) => v);

      this.rollingAvgData = { labels: entries.map(([d]) => d), datasets: [{ data: values }] };

      const max = Math.max(...values, 1);
      this.heatmapData = entries.map(([d, v]) => ({
        date: d,
        level: Math.max(1, Math.ceil((v / max) * 5)) as 1 | 2 | 3 | 4 | 5,
      }));
    });

    const monthKey = new Date().toISOString().slice(0, 7);
    this.svc.getCategoryBreakdown(monthKey).subscribe(({ data = [] }) => {
      this.categoryBarData = {
        labels: data.map(c => c.category),
        datasets: [{ data: data.map(c => +c.amount), backgroundColor: ['#4a90e2', '#50e3c2', '#f5a623', '#7ed321', '#bd10e0'] }],
      };
    });

    this.binance.getCredentials().subscribe(r => this.hasBinance = r.success && !!r.data);
  }

  ngAfterViewInit(): void {
    this.tryInitMap();
  }

  private tryInitMap(): void {
    if (this.map || !this.mapEl?.nativeElement || !this.topLocations.length) { return; }

    const first = this.topLocations[0];
    const container = this.mapEl.nativeElement;

    this.zone.runOutsideAngular(() => {
      this.map = L.map(container, {
        center: [first.latitude, first.longitude],
        zoom: 12,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
      this.marker = L.marker([first.latitude, first.longitude]).addTo(this.map);
      this.updateMapPopup();
    });
  }

  prevLocation(): void {
    if (!this.topLocations.length) { return; }
    this.currentLocIdx = (this.currentLocIdx + this.topLocations.length - 1) % this.topLocations.length;
    this.panToLocation();
  }

  nextLocation(): void {
    if (!this.topLocations.length) { return; }
    this.currentLocIdx = (this.currentLocIdx + 1) % this.topLocations.length;
    this.panToLocation();
  }

  private panToLocation(): void {
    if (!this.map) { return; }
    const loc = this.topLocations[this.currentLocIdx];
    this.map.setView([loc.latitude, loc.longitude], this.map.getZoom(), { animate: false });
    this.updateMapPopup();
  }

  private updateMapPopup(): void {
    if (!this.marker) { return; }

    const loc = this.topLocations[this.currentLocIdx];

    this.marker.setLatLng([loc.latitude, loc.longitude]);
  }

  openBinanceModal(): void {
    this.showBinanceModal = true;
    this.portfolio = null;
    this.binance.getPortfolio(this.userCurrency).subscribe(r => { if (r.success) { this.portfolio = r.data; } });
  }

  closeBinanceModal(): void {
    this.showBinanceModal = false;
  }
}
