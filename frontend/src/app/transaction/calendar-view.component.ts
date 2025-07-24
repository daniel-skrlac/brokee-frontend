import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Transaction } from '../model';
import {
  startOfMonth, endOfMonth, startOfWeek,
  addDays, isSameDay
} from 'date-fns';

@Component({
  selector   : 'app-calendar-view',
  standalone : true,
  imports    : [CommonModule, DecimalPipe],
  templateUrl: './calendar-view.component.html',
  styleUrls  : ['./calendar-view.component.scss'],
})
export class CalendarViewComponent {
  @Input()  transactions: Transaction[] = [];
  @Output() selectDate  = new EventEmitter<Date>();

  today      = new Date();
  monthStart = startOfMonth(this.today);
  monthEnd   = endOfMonth(this.today);
  gridStart  = startOfWeek(this.monthStart, { weekStartsOn: 1 });

  /* 6 rows × 7 cols = 42 days */
  get days(): Date[] {
    return Array.from({ length: 42 }, (_, i) => addDays(this.gridStart, i));
  }

  txTotal(d: Date): number {
    return this.transactions
               .filter(t => isSameDay(t.date, d))
               .reduce((s,t)=>s+(t.type==='expense'? -t.amount : t.amount),0);
  }
}
