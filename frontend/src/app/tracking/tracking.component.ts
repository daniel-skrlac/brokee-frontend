import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
// ESM bundle for Chart.js v4
import Chart from 'chart.js/auto';
import type {
  ChartData,
  ChartOptions,
  ChartEvent,
  ActiveElement,
  TooltipItem,
} from 'chart.js';

import * as L from 'leaflet';
import 'leaflet.markercluster';
import { BaseChartDirective } from 'ng2-charts';
import { CryptoService, Crypto } from '../services/crypto.service';

import { FunnelController, TrapezoidElement } from 'chartjs-chart-funnel';

Chart.register(FunnelController, TrapezoidElement);

interface HeatmapDay {
  level: 1 | 2 | 3 | 4 | 5;
}

// A loose options type that lets you put any chart‑specific props (cutout, etc.)
type LooseChartOptions = {
  [key: string]: any;
};

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.scss'],
  standalone: false,
})
export class TrackingComponent implements OnInit, AfterViewInit {
  private locations: Array<{ lat: number; lng: number }> = [
    { lat: 45.815, lng: 15.9819 }, // Zagreb
  ];

  @ViewChild(BaseChartDirective, { static: false })
  rollingAvgChart?: BaseChartDirective;

  // KPI values
  totalExpenses = 1250;
  totalIncome = 2500;
  budgetRemaining = this.totalIncome - this.totalExpenses;

  // Heatmap
  heatmapData: HeatmapDay[] = [];

  // 30‑day rolling average
  rollingAvgData!: ChartData<'line', number[], string>;
  rollingAvgOptions: LooseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { size: 12 },
        bodyFont: { size: 14 },
        padding: 6,
        cornerRadius: 4,
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: {
          color: '#666',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      y: {
        display: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#666' },
      },
    },
    elements: {
      line: {
        tension: 0.3,
        borderWidth: 2,
        borderColor: '#4a90e2',
        fill: true,
        backgroundColor: 'rgba(74,144,226,0.2)',
      },
      point: {
        radius: 4,
        borderWidth: 2,
        backgroundColor: '#fff',
        borderColor: '#4a90e2',
        hoverRadius: 6,
      },
    },
    layout: { padding: 8 },
  };

  // Spending vs Income
  incomeSpendingData!: ChartData<'bar', number[], string>;
  incomeSpendingOptions: LooseChartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: { x: {}, y: { beginAtZero: true } },
  };

  // Category breakdown
  categoryBarData!: ChartData<'bar', number[], string>;
  categoryBarOptions: LooseChartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: {}, y: { beginAtZero: true } },
  };

  // Savings‑rate gauge
  savingsRate = Math.round(
    ((this.totalIncome - this.totalExpenses) / this.totalIncome) * 100
  );
  savingsRateData!: ChartData<'doughnut', number[], string>;
  savingsRateOptions: LooseChartOptions = {
    responsive: true,
    cutout: '75%',
    plugins: { legend: { display: false } },
  };

  // Cash‑flow funnel
  public funnelType: any = 'funnel';
  funnelData!: ChartData<any, number[], string>;
  funnelOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          // use `any` for the tooltip context so TS stops complaining
          label: (ctx: TooltipItem<any>) => {
            return `${ctx.label}: €${ctx.formattedValue}`;
          },
        },
      },
    },
    layout: { padding: 16 },
  };

  topExpenseLocations = [
    { lat: 45.815, lng: 15.9119, label: 'Zagreb', amount: 500 },
    { lat: 48.2082, lng: 16.3738, label: 'Vienna', amount: 400 },
    { lat: 47.4979, lng: 19.0402, label: 'Budapest', amount: 350 },
  ];

  currentLocationIndex = 0;

  private map!: L.Map;
  private marker!: L.Marker;

  // Crypto modal
  cryptoList: Crypto[] = [];
  showCryptoModal = false;

  constructor(private cryptoSvc: CryptoService) {}

  ngOnInit(): void {
    this.generateHeatmap();
    this.initRollingAvgChart();
    this.initIncomeSpendingChart();
    this.initCategoryBar();
    this.initSavingsRateGauge();
    this.initFunnelChart();
  }

  ngAfterViewInit(): void {
    // give Angular a tick, then instantiate your map
    setTimeout(() => {
      this.initClusterMap();
      this.updateMapLocation();
  
      // force Leaflet to recalc once it’s definitely visible
      setTimeout(() => this.map.invalidateSize(), 300);
    }, 0);
  }
  
  private initClusterMap(): void {
    const loc = this.topExpenseLocations[this.currentLocationIndex];

    this.map = L.map('clusterMap', {
      center: [loc.lat, loc.lng],
      zoom: 12,
      dragging: false,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomAnimation:      false,  // no smooth zoom
      markerZoomAnimation:false,  // markers don’t jump‐zoom
      fadeAnimation:      false,  // no fade on tile change
      bounceAtZoomLimits: false,  // no bounce at min/max zoom
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.marker = L.marker([loc.lat, loc.lng])
      .addTo(this.map)
      .bindPopup(`${loc.label}: €${loc.amount}`)
      .openPopup();
  }

  nextLocation(): void {
    this.currentLocationIndex =
      (this.currentLocationIndex + 1) % this.topExpenseLocations.length;
    this.updateMapLocation();
  
    setTimeout(() => {
      this.map.invalidateSize();
    }, 300); // adjust delay if animation is present
  }

  prevLocation(): void {
    this.currentLocationIndex =
      (this.currentLocationIndex - 1 + this.topExpenseLocations.length) %
      this.topExpenseLocations.length;
    this.updateMapLocation();
  }

  private updateMapLocation() {
    const { lat, lng, label, amount } = this.topExpenseLocations[this.currentLocationIndex];
  
    // Jump center without any CSS transform animation
    this.map.panTo([lat, lng], { animate: false });
  
    // Move the marker and show its popup, but don't let the popup pan the map
    this.marker
      .setLatLng([lat, lng])
      .bindPopup(`${label}: €${amount}`, { autoPan: false })
      .openPopup();
  }

  private generateHeatmap(): void {
    this.heatmapData = Array.from({ length: 30 }, () => ({
      level: (Math.floor(Math.random() * 5) + 1) as HeatmapDay['level'],
    }));
  }

  private initRollingAvgChart(): void {
    const raw = Array.from({ length: 60 }, () => Math.random() * 200 + 20); 
    const rolling: number[] = [];
    for (let i = 30; i < raw.length; i++) {
      const sum = raw.slice(i - 30, i).reduce((a, b) => a + b, 0);
      rolling.push(+(sum / 30).toFixed(2));
    }
    const labels = rolling.map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (rolling.length - 1 - idx));
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    });
    this.rollingAvgData = { labels, datasets: [{ data: rolling }] };
  }

  onRollingAvgClick(evt: { event?: ChartEvent; active?: any[] }): void {
    const chartInst = this.rollingAvgChart?.chart;
    if (!chartInst || !evt.event) return;
    const mouse = evt.event as unknown as MouseEvent;
    const elements: ActiveElement[] = chartInst.getElementsAtEventForMode(
      mouse,
      'nearest',
      { intersect: true },
      true
    );
    if (!elements.length) return;
    const { datasetIndex, index } = elements[0];
    const value = this.rollingAvgData.datasets[datasetIndex].data[
      index
    ] as number;
    const label = this.rollingAvgData.labels![index] as string;
  }

  private initIncomeSpendingChart(): void {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const spending = [300, 250, 330, 290, 310, 280];
    const income = [500, 480, 520, 510, 530, 500];
    this.incomeSpendingData = {
      labels: months,
      datasets: [
        { label: 'Spending', data: spending, backgroundColor: '#4a90e2' },
        { label: 'Income', data: income, backgroundColor: '#7ed321' },
      ],
    };
  }

  private initCategoryBar(): void {
    this.categoryBarData = {
      labels: ['Groceries', 'Transport', 'Entertainment', 'Utilities', 'Other'],
      datasets: [
        {
          data: [300, 150, 100, 90, 120],
          backgroundColor: [
            '#4a90e2',
            '#50e3c2',
            '#f5a623',
            '#7ed321',
            '#bd10e0',
          ],
        },
      ],
    };
  }

  private initSavingsRateGauge(): void {
    this.savingsRateData = {
      labels: ['Saved', 'Remaining'],
      datasets: [
        {
          data: [this.savingsRate, 100 - this.savingsRate],
          backgroundColor: ['#4a90e2', '#e0e0e0'],
          hoverOffset: 4,
        },
      ],
    };
  }

  private initFunnelChart(): void {
    const income = this.totalIncome;
    const saved = this.totalIncome - this.totalExpenses;
    const essentials = this.totalExpenses * 0.7;
    const discretionary = this.totalExpenses * 0.3;
    // cast as any so TS won't complain about backgroundColor on funnel
    this.funnelData = {
      labels: ['Income', 'Saved', 'Essentials', 'Discretionary'],
      datasets: [
        {
          data: [income, saved, essentials, discretionary],
          backgroundColor: ['#4a90e2', '#50e3c2', '#f5a623', '#7ed321'],
        },
      ] as any,
    };
  }

  openCryptoModal(): void {
    this.showCryptoModal = true;
    this.cryptoSvc
      .getTopCryptos(5)
      .subscribe((list) => (this.cryptoList = list));
  }

  closeCryptoModal(): void {
    this.showCryptoModal = false;
  }
}
