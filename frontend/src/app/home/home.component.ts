import { Component, OnInit } from '@angular/core';
import { DashboardService }  from '../services/dashboard.service';
import { DashboardData }     from '../models/dashboard';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false
})
export class HomeComponent implements OnInit {
  dashboard!: DashboardData;
  loading = true;
  error: string | null = null;

  today = new Date();
  userName = 'Daniel';
  budgetUsage = 65;
  scheduledCount = 3;

  viewMode: 'byday' | 'daily' | 'monthly' = 'byday';
  selectedDay = new Date();
  selectedDayStr = this.toInputDate(this.selectedDay);

  public chartData!: ChartData<'line', number[], string>;
  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true }
    }
  };

  recentTransactions = [
    { icon:'🛒', description:'Grocery Store', date:new Date(2025,6,20), amount:-45.30 },
    { icon:'☕️', description:'Coffee Shop',   date:new Date(2025,6,19), amount:-4.50 },
    { icon:'💼', description:'Salary',        date:new Date(2025,6,18), amount:2500.00 },
    { icon:'🚗', description:'Gas Station',   date:new Date(2025,6,17), amount:-60.00 },
    { icon:'🎬', description:'Movie Night',   date:new Date(2025,6,16), amount:-12.00 },
  ];
  upcomingBills = [
    { name:'Electricity', date:new Date(2025,6,25), amount:120 },
    { name:'Rent',        date:new Date(2025,7,1),  amount:700 }
  ];

  constructor(private svc: DashboardService) {}

  ngOnInit() {
    this.svc.getDashboard().subscribe({
      next: resp => {
        this.loading = false;
        if (resp.success) {
          this.dashboard = resp.data;
          this.updateChart();
        } else {
          this.error = resp.message;
        }
      },
      error: _ => {
        this.loading = false;
        this.error = 'Failed loading';
      }
    });
  }

  toggle(mode: 'byday' | 'daily' | 'monthly') {
    this.viewMode = mode;
    this.updateChart();
  }

  onDayChange(value?: string) {
    if (!value) {
      return;
    }
    this.selectedDay     = new Date(value);
    this.selectedDayStr  = value;
    this.updateChart();
  }

  updateChart() {
    if (this.viewMode === 'daily') {
      const m: Record<string,number> = {};
      this.dashboard.dailyExpenses.forEach(p => {
        const wk = new Date(p.date)
                    .toLocaleDateString('en-US',{weekday:'short'});
        m[wk] = (m[wk]||0) + p.amount;
      });
      const weekdays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      this.chartData = {
        labels: weekdays,
        datasets: [{
          data: weekdays.map(d => m[d]||0),
          fill: false, tension: 0.3, borderWidth: 2
        }]
      };

    } else if (this.viewMode === 'byday') {
      const hrs    = Array.from({length:24},(_,h)=>h);
      this.chartData = {
        labels: hrs.map(h=> (h<10?'0':'')+h+':00'),
        datasets: [{
          data: hrs.map(()=>Math.floor(Math.random()*50+5)),
          fill: false, tension: 0.3, borderWidth: 2
        }]
      };

    } else {
      const pts = this.dashboard.monthlyExpenses;
      this.chartData = {
        labels: pts.map(p=>p.month!),
        datasets: [{
          data: pts.map(p=>p.amount),
          fill: false, tension: 0.3, borderWidth: 2
        }]
      };
    }
  }

  private toInputDate(d: Date) {
    return d.toISOString().slice(0,10);
  }

  onAdd()     {}
  onScanQR()  {}
  onScanCash(){}
}
