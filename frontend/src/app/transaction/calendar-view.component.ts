import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  startOfMonth, endOfMonth, startOfWeek,
  addDays, isSameDay, startOfDay,
  isBefore
} from 'date-fns';

import type { UITransaction } from './transaction.component';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.scss']
})
export class CalendarViewComponent {


  today = startOfDay(new Date());

  isToday(d: Date) {
    return isSameDay(d, this.today);
  }

  isPast(t: UITransaction) {
    return isBefore(t.date, this.today);
  }

  @Input() transactions: UITransaction[] = [];
  @Output() openTx = new EventEmitter<UITransaction>();
  @Output() openDay = new EventEmitter<Date>();

  private monthStart = startOfMonth(this.today);
  private monthEnd = endOfMonth(this.today);
  private gridStart = startOfWeek(this.monthStart, { weekStartsOn: 1 });

  get days(): Date[] {
    return Array.from({ length: 42 }, (_, i) => addDays(this.gridStart, i));
  }

  isOtherMonth(d: Date) {
    return d < this.monthStart || d > this.monthEnd;
  }

  txOfDay(d: Date): UITransaction[] {
    return this.transactions.filter(t => isSameDay(t.date, d))
      .sort((a, b) => a.amount - b.amount);
  }
}
