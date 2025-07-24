import { Component, OnInit } from '@angular/core';
import { Transaction }       from '../model';
import { startOfDay }        from 'date-fns';

@Component({
  selector   : 'app-transactions',
  templateUrl: './transaction.component.html',
  styleUrls  : ['./transaction.component.scss'],
  standalone:false
})
export class TransactionComponent implements OnInit {
  /* ------------ data ------------ */
  transactions: Transaction[] = [];   // full list (API)
  viewTx      : Transaction[] = [];   // filtered result
  groups      : Record<string, Transaction[]> = {};

  /* ------------ UI state ------------ */
  mode: 'list' | 'calendar' = 'list';

  q       = '';                                          // search text
  f = {                                                  // filters
    type      : '',
    from      : '',
    to        : '',
    min       : null as number | null,
    max       : null as number | null,
    recurring : false,
  };

  /* ============== life‑cycle ============== */
  ngOnInit(): void {
    this.transactions = this.demoSeed();  // <‑‑ replace with API call
    this.applyFilters();
  }

  /* ============== getters ============== */
  get groupKeys(): string[] {
    return Object.keys(this.groups)
                 .sort((a, b) => +new Date(b) - +new Date(a)); // newest → oldest
  }

  /* ============== actions ============== */
  switch(mode: 'list' | 'calendar'){ this.mode = mode; }

  clear(): void {
    this.q = '';
    this.f = { type:'', from:'', to:'', min:null, max:null, recurring:false };
    this.applyFilters();
  }

  handleSelect(date: Date): void {      // from calendar
    this.f.from = this.f.to = date.toISOString().split('T')[0];
    this.mode = 'list';
    this.applyFilters();
  }

  /* ============== filtering ============== */
  applyFilters(): void {
    const { type, from, to, min, max, recurring } = this.f;
    const ql = this.q.toLowerCase();

    this.viewTx = this.transactions.filter(t => {
      const qMatch =
        !this.q ||
        [t.merchant, t.note, t.category]
          .some(v => v?.toLowerCase().includes(ql));

      const typeM = !type || t.type === type;
      const dateM =
        (!from || t.date >= new Date(from)) &&
        (!to   || t.date <= new Date(to));
      const amtM  =
        (min == null || t.amount >= min) &&
        (max == null || t.amount <= max);
      const recM  = !recurring || t.isRecurring;

      return qMatch && typeM && dateM && amtM && recM;
    });

    /* group by day */
    this.groups = this.viewTx.reduce((acc, t) => {
      const key = startOfDay(t.date).toDateString();
      (acc[key] ||= []).push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }

  /* ============== demo data ============== */
  private demoSeed(): Transaction[] {
    const today = new Date();
    const yest  = new Date(today); yest.setDate(today.getDate()-1);
    const fut   = new Date(today); fut.setDate(today.getDate()+4);

    return [
      { id:'1', type:'expense', amount:45,  category:'Groceries', categoryIcon:'🛒', merchant:'Store', note:'Weekly food', date:today, paymentMethod:'Visa' },
      { id:'2', type:'income',  amount:1200,category:'Salary',    categoryIcon:'💼', date:yest },
      { id:'3', type:'expense', amount:200, category:'Rent',      categoryIcon:'🏠', date:fut, planned:true, isRecurring:true },
    ];
  }
}
