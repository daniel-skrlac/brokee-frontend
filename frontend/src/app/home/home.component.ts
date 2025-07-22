import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { DashboardData } from '../models/dashboard';
import { ChartData, ChartOptions } from 'chart.js';
import { BarcodeFormat } from '@zxing/library';
import Tesseract from 'tesseract.js';
import { ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false,
})
export class HomeComponent implements OnInit {
  @ViewChild('cashVideo', { static: false })
  cashVideo!: ElementRef<HTMLVideoElement>;

  private ocrIntervalId: any;
  showCashModal = false;
  ocrRunning = false;
  recognizedValue: number | null = null;

  allowedFormats = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ];
  showScanner = false;
  qrText: string | null = null;
  extractedPrice: number | null = null;

  showAddModal = false;
  newExpense = {
    description: '',
    amount: null,
    date: this.toInputDate(new Date()),
    category: '',
  };

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
  chartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { maxRotation: 0, autoSkip: true },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  recentTransactions = [
    {
      icon: '🛒',
      description: 'Grocery Store',
      date: new Date(2025, 6, 20),
      amount: -45.3,
    },
    {
      icon: '☕️',
      description: 'Coffee Shop',
      date: new Date(2025, 6, 19),
      amount: -4.5,
    },
    {
      icon: '💼',
      description: 'Salary',
      date: new Date(2025, 6, 18),
      amount: 2500.0,
    },
    {
      icon: '🚗',
      description: 'Gas Station',
      date: new Date(2025, 6, 17),
      amount: -60.0,
    },
    {
      icon: '🎬',
      description: 'Movie Night',
      date: new Date(2025, 6, 16),
      amount: -12.0,
    },
  ];
  upcomingBills = [
    { name: 'Electricity', date: new Date(2025, 6, 25), amount: 120 },
    { name: 'Rent', date: new Date(2025, 7, 1), amount: 700 },
  ];

  constructor(private svc: DashboardService) {}

  ngOnInit() {
    this.svc.getDashboard().subscribe({
      next: (resp) => {
        this.loading = false;
        if (resp.success) {
          this.dashboard = resp.data;
          this.updateChart();
        } else {
          this.error = resp.message;
        }
      },
      error: (_) => {
        this.loading = false;
        this.error = 'Failed loading';
      },
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
    this.selectedDay = new Date(value);
    this.selectedDayStr = value;
    this.updateChart();
  }

  updateChart() {
    if (this.viewMode === 'daily') {
      const m: Record<string, number> = {};
      this.dashboard.dailyExpenses.forEach((p) => {
        const wk = new Date(p.date).toLocaleDateString('en-US', {
          weekday: 'short',
        });
        m[wk] = (m[wk] || 0) + p.amount;
      });
      const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      this.chartData = {
        labels: weekdays,
        datasets: [
          {
            data: weekdays.map((d) => m[d] || 0),
            fill: false,
            tension: 0.3,
            borderWidth: 2,
          },
        ],
      };
    } else if (this.viewMode === 'byday') {
      const hrs = Array.from({ length: 24 }, (_, h) => h);
      this.chartData = {
        labels: hrs.map((h) => (h < 10 ? '0' : '') + h + ':00'),
        datasets: [
          {
            data: hrs.map(() => Math.floor(Math.random() * 50 + 5)),
            fill: false,
            tension: 0.3,
            borderWidth: 2,
          },
        ],
      };
    } else {
      const pts = this.dashboard.monthlyExpenses;
      this.chartData = {
        labels: pts.map((p) => p.month!),
        datasets: [
          {
            data: pts.map((p) => p.amount),
            fill: false,
            tension: 0.3,
            borderWidth: 2,
          },
        ],
      };
    }
  }

  private toInputDate(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  onAdd() {
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  submitExpense() {
    console.log('Expense submitted:', this.newExpense);
    // TODO: Add real logic here (save to backend, update list, etc.)
    this.closeAddModal();
  }

  onScanQR() {
    this.qrText = null;
    this.extractedPrice = null;
    this.showScanner = true;
  }

  onCodeResult(resultString: string) {
    this.qrText = resultString;
    const m = /price\s*[:=]\s*([0-9]+(?:\.[0-9]{1,2})?)/i.exec(resultString);
    if (m) {
      this.extractedPrice = parseFloat(m[1]);
    }
  }

  closeScanner() {
    this.showScanner = false;
  }

  saveScanned() {
    // TODO: now you have this.extractedPrice → send to your form, etc.
    console.log('Saving price:', this.extractedPrice);
    this.closeScanner();
  }

  onScanCash() {
    this.recognizedValue = null;
    this.showCashModal = true;
    this.startCamera().then(() => {
      this.ocrIntervalId = setInterval(() => this.captureAndRead(), 300);
    });
  }

  resetCashScan() {
    this.recognizedValue = null;
    this.restartCashScanner();
  }

  private async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      this.cashVideo.nativeElement.srcObject = stream;
    } catch (err) {}
  }

  private async restartCashScanner() {
    clearInterval(this.ocrIntervalId);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      this.cashVideo.nativeElement.srcObject = stream;

      // every 2s, grab a frame and run OCR
      this.ocrIntervalId = setInterval(() => this.captureAndRead(), 300);
    } catch (err) {}
  }

  private async captureAndRead() {
    const video = this.cashVideo.nativeElement;
    // ensure video is ready and not already running OCR
    if (!video.videoWidth || !video.videoHeight || this.ocrRunning) {
      return;
    }

    this.ocrRunning = true;

    // draw current frame to off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    try {
      const { data } = await Tesseract.recognize(canvas, 'eng');
      const text = data.text.replace(/\s+/g, ' ');
      const match = /([0-9]{2,3})/.exec(text);
      if (match) {
        this.recognizedValue = parseInt(match[1], 10);
        clearInterval(this.ocrIntervalId); // stop further OCR
      }
    } catch {
    } finally {
      this.ocrRunning = false;
    }
  }

  saveCash() {
    if (this.recognizedValue !== null) {
      console.log('Saving cash amount:', this.recognizedValue);
      this.closeCash();
    }
  }

  closeCash() {
    this.showCashModal = false;
    clearInterval(this.ocrIntervalId);

    const stream = this.cashVideo.nativeElement.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
      });
    }
  }
}
