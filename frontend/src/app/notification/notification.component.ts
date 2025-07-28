import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiNotificationScreen, NotificationService } from '../services/notification.service';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div *ngIf="note as n" class="notification" [ngClass]="n.type">
      <span class="icon">{{ iconFor(n.type) }}</span>
      <span class="message">{{ n.message }}</span>
      <button class="close" (click)="clear()">X</button>
    </div>
  `,
    styles: [`
    .notification {
      position: fixed;
      top: 1rem;
      right: 1rem;
      display: flex;
      align-items: center;
      min-width: 300px;
      padding: 1rem 1.5rem;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      color: #fff;
      font-size: 1rem;
      backdrop-filter: blur(10px);
      animation: slideIn 0.4s ease-out;
      z-index: 1000;
    }

    .notification.success { background: #4caf50; }
    .notification.error   { background: #f44336; }
    .notification.info    { background: #2196f3; }

    .notification .icon {
      margin-right: 0.75rem;
      font-size: 1.25rem;
    }

    .notification .message {
      flex: 1;
      line-height: 1.4;
    }

    .notification .close {
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      margin-left: 1rem;
    }

    @keyframes slideIn {
      from { transform: translateX(120%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
  `]
})
export class NotificationComponent implements OnInit {
    note: ApiNotificationScreen | null = null;
    private timeoutId?: any;
    private notif = inject(NotificationService);

    ngOnInit() {
        this.notif.notifications$.subscribe(n => {
            this.note = n;
            clearTimeout(this.timeoutId);
            this.timeoutId = setTimeout(() => this.clear(), 5000);
        });
    }

    clear() {
        this.note = null;
        clearTimeout(this.timeoutId);
    }

    iconFor(type: ApiNotificationScreen['type']): string {
        switch (type) {
            case 'success': return '✔️';
            case 'error': return '❌';
            default: return '';
        }
    }
}
