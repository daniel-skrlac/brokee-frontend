import {
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  NgZone,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ChartData, ChartOptions } from 'chart.js';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';

import {
  LocationDTO,
  FullPortfolioDTO
} from '../api/dtos';
import { TrackingService } from './tracking.service';
import { BinanceService } from './binance.service';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.scss']
})
export class TrackingComponent implements OnInit, AfterViewInit {
  themes = ['light', 'dark'] as const;
  theme: 'light' | 'dark' = "light";

  userCurrency = localStorage.getItem('user-currency') || 'EUR';
  hasBinance = false;
  showBinanceModal = false;
  portfolio: FullPortfolioDTO | null = null;

  spendingIncomeData!: ChartData<'bar', number[], string>;
  spendingIncomeOpts: ChartOptions = { responsive: true, scales: { y: { beginAtZero: true } } };

  funnelData!: ChartData<'bar', number[], string>;
  funnelOpts: ChartOptions = { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } };

  savingsRate = 0;
  gaugeData!: ChartData<'doughnut', number[], string>;
  gaugeOpts: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    cutout: '75%'
  };

  rollingAvgData!: ChartData<'line', number[], string>;
  rollingAvgOpts: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio,
    plugins: {
      legend: { display: false }
    },
    elements: {
      line: { tension: 0.3, borderWidth: 2 },
      point: { radius: 4, backgroundColor: '#4a90e2', borderColor: '#fff', borderWidth: 2, hoverRadius: 6 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true }
    }
  };

  private themeService = inject(ThemeService);

  @ViewChild('rollingAvgChart', { static: false }) rollingAvgChart?: BaseChartDirective;

  heatmapData: { date: string; level: 1 | 2 | 3 | 4 | 5 }[] = [];

  categoryBarData!: ChartData<'bar', number[], string>;
  categoryBarOpts: ChartOptions = { responsive: true, plugins: { legend: { display: false } } };

  topLocations: LocationDTO[] = [];
  currentLocIdx = 0;
  private map!: L.Map;
  private marker!: L.Marker;

  constructor(
    private svc: TrackingService,
    private binance: BinanceService,
    private zone: NgZone
  ) { }

  ngOnInit() {
    this.theme = this.themeService.initTheme();

    const year = new Date().getFullYear();
    this.svc.getSpendingVsIncome(year).subscribe(r => {
      const arr = r.data || [];
      this.spendingIncomeData = {
        labels: arr.map(o => o.month!),
        datasets: [{
          label: 'Spending',
          data: arr.map(o => +o.expenses),
          backgroundColor: '#4a90e2'
        }, {
          label: 'Income',
          data: arr.map(o => +o.income),
          backgroundColor: '#7ed321'
        }]
      };
      const totalSp = arr.reduce((sum, o) => sum + +o.expenses, 0);
      const totalIn = arr.reduce((sum, o) => sum + +o.income, 0);
      this.savingsRate = totalIn ? Math.round(((totalIn - totalSp) / totalIn) * 100) : 0;
      this.gaugeData = {
        labels: ['Saved', 'Used'],

        datasets: [{
          data: [this.savingsRate, 100 - this.savingsRate],
          backgroundColor: ['#50e3c2', '#e0e0e0']
        }]
      };
      this.funnelData = {
        labels: ['Income', 'Saved', 'Spent'],
        datasets: [{ data: [totalIn, totalIn - totalSp, totalSp], backgroundColor: ['#4a90e2', '#50e3c2', '#f5a623'] }]
      };
    });

    this.svc.getTopLocations(3).subscribe(r => this.topLocations = r.data || []);

    this.svc.getDailyExpenses(30).subscribe(r => {
      const daily = r.data || {};
      const entries = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
      const vals = entries.map(e => e[1]);
      this.rollingAvgData = {
        labels: entries.map(e => e[0]),
        datasets: [{ data: vals }]
      };
      const max = Math.max(...vals);
      this.heatmapData = entries.map(([d, v]) => ({
        date: d,
        level: Math.max(1, Math.ceil((v / max) * 5)) as 1 | 2 | 3 | 4 | 5
      }));
    });

    const monthKey = new Date().toISOString().slice(0, 7);
    this.svc.getCategoryBreakdown(monthKey).subscribe(r => {
      const cats = r.data || [];
      this.categoryBarData = {
        labels: cats.map(c => c.category),
        datasets: [{ data: cats.map(c => +c.amount), backgroundColor: ['#4a90e2', '#50e3c2', '#f5a623', '#7ed321', '#bd10e0'] }]
      };
    });

    this.binance.getCredentials().subscribe(r => {
      this.hasBinance = r.success && !!r.data;
    });
  }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        if (this.topLocations.length && !this.map) {
          const loc = this.topLocations[0];
          this.map = L.map('clusterMap', {
            center: [loc.latitude, loc.longitude], zoom: 12, zoomControl: false,
            dragging: false, scrollWheelZoom: false, doubleClickZoom: false
          });
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
            .addTo(this.map);
          this.marker = L.marker([loc.latitude, loc.longitude]).addTo(this.map);
          this.updateMapPopup();
        }
      }, 0);
    });
  }

  openBinanceModal() {
    this.showBinanceModal = true;
    this.portfolio = null;
    this.binance.getPortfolio('EUR').subscribe(r => {
      if (r.success) {
        this.portfolio = r.data;
      }
    });
  }

  closeBinanceModal() {
    this.showBinanceModal = false;
  }

  prevLocation() {
    this.currentLocIdx = (this.currentLocIdx + this.topLocations.length - 1) % this.topLocations.length;
    this.panToLocation();
  }
  nextLocation() {
    this.currentLocIdx = (this.currentLocIdx + 1) % this.topLocations.length;
    this.panToLocation();
  }
  private panToLocation() {
    const loc = this.topLocations[this.currentLocIdx];
    this.map.setView([loc.latitude, loc.longitude], 12, { animate: false });
    this.updateMapPopup();
  }
  private updateMapPopup() {
    const loc = this.topLocations[this.currentLocIdx];
    this.marker.setLatLng([loc.latitude, loc.longitude])
      .bindPopup(`${loc.label}: €${loc.amount.toFixed(2)}`, { autoPan: false })
      .openPopup();
  }
}
