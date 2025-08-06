/* ────────────────────────────────────────────────────────────────
   TransactionComponent
   • list & calendar views
   • quick-add, full-add, planned-add
   • radio-button (“Use my location ?”) → writes latitude/longitude
   • auto-prefill edit dialog (even for former quick-adds)
   • delete (regular & planned)
   ──────────────────────────────────────────────────────────────── */

import {
  Component, OnInit, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { combineLatest, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { startOfDay } from 'date-fns';

import { CalendarViewComponent } from './calendar-view.component';

import {
  TxResponseDTO, PlannedTxResponseDTO,
  FullTxRequestDTO, PlannedTxRequestDTO,
  CategoryResponseDTO, ServiceResponseDTO
} from '../api/dtos';

import { TransactionService } from './transaction.service';
import { PlannedTxService } from './planned-tx.service';
import { CategoryService } from '../settings/category.service';
import { RevolutService } from './revolut.service';

/* ————————————————— icon map ————————————————— */
const ICONS: Record<string, string> = {
  'ATM Fee': '🏧', 'Business': '💼', 'Cash Withdrawal': '💳', 'Clothing': '👚',
  'Dining Out': '🍽️', 'Education': '🎓', 'Entertainment': '🎭', 'Fuel': '⛽',
  'General': '📦', 'Gifts & Donations': '🎁', 'Groceries': '🛒', 'Health & Fitness': '💪',
  'Home Maintenance': '🛠️', 'Insurance': '🛡️', 'Internet': '🌐', 'Investments': '💹',
  'Kids': '🧸', 'Miscellaneous': '✨', 'Mobile Phone': '📱', 'Personal Care': '🧴',
  'Pets': '🐾', 'Rent': '🏠', 'Revolut': '💳', 'Savings': '💰', 'Shopping': '🛍️',
  'Streaming Services': '📺', 'Subscriptions': '🔄', 'Taxes': '🧾',
  'Transportation': '🚗', 'Travel': '✈️', 'Utilities': '💡'
};
const DEFAULT_ICON = '💳';
const iconFor = (name?: string) => ICONS[name ?? ''] ?? DEFAULT_ICON;

/* ————————————————— view-model ————————————————— */
interface UITransaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  categoryId?: number | null;
  category: string;
  date: Date;
  note?: string;
  planned: boolean;
  categoryIcon: string;
  hasFull: boolean;
}

type ModalMode =
  | 'view' | 'delete'
  | 'quickEdit' | 'fullEdit' | 'planEdit'
  | 'newTx' | 'newPlan';

@Component({
  selector: 'app-transactions',
  standalone: true,
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.scss'],
  imports: [CommonModule, FormsModule, DecimalPipe, CalendarViewComponent]
})
export class TransactionComponent implements OnInit {

  /* ——— datasets ——— */
  private items: UITransaction[] = [];
  viewTx: UITransaction[] = [];
  groups: Record<string, UITransaction[]> = {};

  /* ——— paging ——— */
  readonly size = 10;
  currentPage = 0;
  totalPages = 1;
  private filteredPages = 1;

  /* ——— filters / UI ——— */
  mode: 'list' | 'calendar' = 'list';
  fabOpen = false;
  searchTxt = '';
  f = {
    type: '',
    from: '',
    to: '',
    min: null as number | null,
    max: null as number | null,
    recurring: false
  };

  /* ——— modal state ——— */
  modalMode: ModalMode = 'view';
  selected: UITransaction | null = null;
  editForm: any = {};          // dynamic – see openEdit / addTx / addPlanned
  loadingEdit = false;

  /* ——— dropdown data ——— */
  categories: CategoryResponseDTO[] = [];

  @ViewChild('pdfInput') pdfInput!: ElementRef<HTMLInputElement>;

  constructor(
    private txApi: TransactionService,
    private planApi: PlannedTxService,
    private catApi: CategoryService,
    private revApi: RevolutService
  ) { }

  /* ═════════════════ INIT ═════════════════ */
  ngOnInit(): void {
    this.catApi.listAll()
      .pipe(catchError(() => of({ data: [] } as unknown as ServiceResponseDTO<CategoryResponseDTO[]>)))
      .subscribe(r => this.categories = r.data ?? []);

    this.fetchPage(0);
  }

  /* ════════════════ DATA FETCH ════════════════ */
  fetchPage(page: number): void {
    this.currentPage = page;
    const monthKey = new Date().toISOString().slice(0, 7);
    const from = `${monthKey}-01`, to = `${monthKey}-31`;

    combineLatest({
      tx: this.txApi.page(page, this.size)
        .pipe(catchError(() => of({ data: { items: [], total: 0 } } as any))),
      plan: this.planApi.list(undefined, from, to)
        .pipe(catchError(() => of({ data: [] } as any)))
    }).subscribe(({ tx, plan }) => {
      const reg = (tx.data?.items ?? []).map(this.mapRegular);
      const pla = (plan.data ?? []).map(this.mapPlanned);
      this.items = [...reg, ...pla].sort((a, b) => +b.date - +a.date);
      this.totalPages = Math.max(1, Math.ceil((tx.data?.total ?? 0) / this.size));
      this.recalcView();
    });
  }

  /* — mapping helpers — */
  private mapRegular = (t: TxResponseDTO): UITransaction => ({
    id: String(t.id),
    type: t.type === 'E' ? 'expense' : 'income',
    amount: +t.amount,
    categoryId: t.categoryId,
    category: t.locationName || 'General',
    date: new Date(t.txTime),
    note: t.note,
    planned: false,
    categoryIcon: iconFor(t.locationName),
    hasFull: true
  });

  private mapPlanned = (p: PlannedTxResponseDTO): UITransaction => ({
    id: `p-${p.id}`,
    type: p.type === 'E' ? 'expense' : 'income',
    amount: +p.amount,
    categoryId: p.categoryId,
    category: p.title,
    date: new Date(p.dueDate),
    planned: true,
    note: '',
    categoryIcon: iconFor(p.title),
    hasFull: true
  });

  /* ════════════════ FILTER / GROUP ════════════════ */
  recalcView(): void {
    const { type, from, to, min, max, recurring } = this.f;
    const q = this.searchTxt.toLowerCase();

    this.viewTx = this.items.filter(t => {
      const txt = !q || [t.category, t.note].some(v => v?.toLowerCase().includes(q));
      const typ = !type || t.type === type;
      const dat = (!from || t.date >= new Date(from)) && (!to || t.date <= new Date(to));
      const amt = (min == null || t.amount >= min) && (max == null || t.amount <= max);
      const rec = recurring ? true : !t.planned;
      return txt && typ && dat && amt && rec;
    });

    this.filteredPages = Math.max(1, Math.ceil(this.viewTx.length / this.size));
    if (this.currentPage >= this.displayPages) this.currentPage = 0;

    this.groups = this.viewTx.reduce((a, t) => {
      const key = startOfDay(t.date).toDateString();
      (a[key] ??= []).push(t);
      return a;
    }, {} as Record<string, UITransaction[]>);
  }

  get displayPages(): number { return Math.max(this.totalPages, this.filteredPages); }
  get groupKeys(): string[] { return Object.keys(this.groups).sort((a, b) => +new Date(b) - +new Date(a)); }

  /* ===== filter helpers ===== */
  clearFilters() {
    this.searchTxt = '';
    this.f = { type: '', from: '', to: '', min: null, max: null, recurring: false };
    this.recalcView();
  }
  handleDatePick(d: Date) {
    this.f.from = this.f.to = d.toISOString().slice(0, 10);
    this.mode = 'list';
    this.recalcView();
  }

  /* ===== paging helpers ===== */
  nextPage() { if (this.currentPage + 1 < this.displayPages) this.fetchPage(this.currentPage + 1); }
  prevPage() { if (this.currentPage > 0) this.fetchPage(this.currentPage - 1); }

  /* ════════════════ VIEW / DELETE ════════════════ */
  openView(t: UITransaction) { this.selected = { ...t }; this.modalMode = 'view'; }
  openDelete(t: UITransaction) { this.selected = { ...t }; this.modalMode = 'delete'; }

  confirmDelete(): void {
    if (!this.selected) return;
    const isPlanned = this.selected.planned;
    const id = +this.selected.id.replace(/^p-/, '');
    const obs = isPlanned ? this.planApi.delete(id) : this.txApi.delete(id);
    obs.subscribe(() => this.afterSave());
  }

  /* ════════════════ EDIT (auto-prefill) ════════════════ */
  openEdit(t: UITransaction): void {
    this.loadingEdit = true;
    this.selected = { ...t };

    /* open() helper */
    const open = (data: any, mode: ModalMode) => {
      this.editForm = { ...data, useGeo: !!data.latitude }; // keep checkbox state
      this.modalMode = mode;
      this.loadingEdit = false;
    };

    if (t.planned) {
      open({
        id: t.id.slice(2),
        type: t.type,
        amount: t.amount,
        categoryId: t.categoryId,
        title: t.category,
        date: t.date.toISOString().slice(0, 10),
        note: '',

        /* geo */
        useGeo: false,
        latitude: null,
        longitude: null
      }, 'planEdit');
    } else if (t.hasFull) {
      /* already a full tx */
      open({
        id: t.id,
        type: t.type,
        amount: t.amount,
        categoryId: t.categoryId,
        date: t.date.toISOString().slice(0, 16),
        note: t.note || '',

        useGeo: false,
        latitude: null,
        longitude: null
      }, 'fullEdit');
    } else {
      /* quick-add – fetch full payload first */
      this.txApi.getById(+t.id).subscribe(resp => {
        const full = resp.data;
        open({
          id: String(full.id),
          type: full.type === 'E' ? 'expense' : 'income',
          amount: +full.amount,
          categoryId: full.categoryId,
          date: new Date(full.txTime).toISOString().slice(0, 16),
          note: full.note || '',

          useGeo: false,
          latitude: null,
          longitude: null
        }, 'fullEdit');
      });
    }
  }

  /* helper – wrap geolocation into a Promise */
  private getLocation(): Promise<{ lat: number, lon: number } | null> {
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        p => resolve({
          lat: +p.coords.latitude.toFixed(6),
          lon: +p.coords.longitude.toFixed(6)
        }),
        _ => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  /* ════════════════ SAVE EDIT ════════════════ */
  async saveEdit(f: NgForm) {
    if (f.invalid) return;

    /* grab coords if requested */
    if (this.editForm.useGeo) {
      const pos = await this.getLocation();
      if (pos) {
        this.editForm.latitude = pos.lat;
        this.editForm.longitude = pos.lon;
      }
    }

    if (this.modalMode === 'quickEdit' || this.modalMode === 'fullEdit') {
      const dto: FullTxRequestDTO = {
        type: this.editForm.type === 'expense' ? 'E' : 'I',
        amount: +this.editForm.amount,
        categoryId: +this.editForm.categoryId,
        txTime: new Date(this.editForm.date),
        note: this.editForm.note || '',
        latitude: this.editForm.useGeo ? this.editForm.latitude : null,
        longitude: this.editForm.useGeo ? this.editForm.longitude : null
      };
      this.txApi.patch(+this.editForm.id, dto).subscribe(() => this.afterSave());
    } else { /* planEdit */
      const dto: PlannedTxRequestDTO = {
        type: this.editForm.type === 'expense' ? 'E' : 'I',
        categoryId: +this.editForm.categoryId,
        title: this.editForm.title,
        amount: +this.editForm.amount,
        dueDate: new Date(this.editForm.date) as any,
        autoBook: false
      };
      this.planApi.update(+this.editForm.id, dto).subscribe(() => this.afterSave());
    }
  }

  /* ════════════════ NEW ════════════════ */
  addTx() {
    this.modalMode = 'newTx';
    this.editForm = {
      type: 'expense',
      amount: 0,
      categoryId: null,
      date: new Date().toISOString().slice(0, 16),
      note: '',
      useGeo: false,
      latitude: null,
      longitude: null
    };
  }

  addPlanned() {
    this.modalMode = 'newPlan';
    this.editForm = {
      type: 'expense',
      amount: 0,
      categoryId: null,
      title: '',
      date: new Date().toISOString().slice(0, 10),
      note: '',
      useGeo: false,
      latitude: null,
      longitude: null
    };
  }

  async saveNew(f: NgForm) {
    if (f.invalid) return;

    if (this.editForm.useGeo) {
      const pos = await this.getLocation();
      if (pos) {
        this.editForm.latitude = pos.lat;
        this.editForm.longitude = pos.lon;
      }
    }

    if (this.modalMode === 'newTx') {
      const dto: FullTxRequestDTO = {
        type: this.editForm.type === 'expense' ? 'E' : 'I',
        amount: +this.editForm.amount,
        categoryId: +this.editForm.categoryId,
        txTime: new Date(this.editForm.date),
        note: this.editForm.note || '',
        latitude: this.editForm.useGeo ? this.editForm.latitude : null,
        longitude: this.editForm.useGeo ? this.editForm.longitude : null
      };
      this.txApi.create(dto).subscribe(() => this.afterSave());
    } else { /* newPlan */
      const dto: PlannedTxRequestDTO = {
        type: this.editForm.type === 'expense' ? 'E' : 'I',
        categoryId: +this.editForm.categoryId,
        title: this.editForm.title,
        amount: +this.editForm.amount,
        dueDate: new Date(this.editForm.date) as any,
        autoBook: false
      };
      this.planApi.create(dto).subscribe(() => this.afterSave());
    }
  }

  /* convenience flags */
  isEdit(): boolean { return ['quickEdit', 'fullEdit', 'planEdit'].includes(this.modalMode); }
  isNew(): boolean { return ['newTx', 'newPlan'].includes(this.modalMode); }

  /* after any mutation */
  afterSave() { this.closeModal(); this.fetchPage(this.currentPage); }

  closeModal() {
    this.modalMode = 'view';
    this.selected = null;
    this.editForm = {};
    this.loadingEdit = false;
  }

  /* PDF import */
  handlePdfChosen(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.revApi.importPdf(f).subscribe(() => this.fetchPage(this.currentPage));
    this.fabOpen = false;
  }
}
