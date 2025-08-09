import {
  Component, OnInit, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  startOfDay, startOfMonth, endOfMonth, isSameMonth,
  format,
  addDays
} from 'date-fns';

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
import { safeDate } from '../utils/date-safe';
import { ThemeService } from '../theme.service';
import { NotificationService } from '../services/notification.service';

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
const iconFor = (n?: string) => ICONS[n ?? ''] ?? DEFAULT_ICON;

export interface UITransaction {
  id: string; type: 'expense' | 'income'; amount: number;
  categoryId?: number | null; category: string; date: Date; note?: string;
  planned: boolean; categoryIcon: string; hasFull: boolean;
}
type ModalMode =
  | 'view' | 'delete'
  | 'quickEdit' | 'fullEdit'
  | 'planEdit' | 'newTx' | 'newPlan';

@Component({
  selector: 'app-transactions',
  standalone: true,
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.scss'],
  imports: [CommonModule, FormsModule, DecimalPipe, CalendarViewComponent]
})
export class TransactionComponent implements OnInit {

  themes = ['light', 'dark'] as const;
  theme: 'light' | 'dark' = "light";

  private _mode: 'list' | 'calendar' = 'list';
  set mode(m: 'list' | 'calendar') {
    this._mode = m;
    this.currentPage = 0;
    this.recalcView();
  }
  get mode() { return this._mode; }
  setMode(m: 'list' | 'calendar') { this.mode = m; }

  private items: UITransaction[] = [];
  viewTx: UITransaction[] = [];
  groups: Record<string, UITransaction[]> = {};

  readonly size = 10;
  currentPage = 0;
  private filteredPages = 1;
  private totalPages = 1;

  fabOpen = false;
  searchTxt = '';
  f = {
    type: '', from: '', to: '',
    min: null as number | null, max: null as number | null,
    recurring: false
  };

  modalMode: ModalMode = 'view';
  selected: UITransaction | null = null;
  editForm: any = {}; loadingEdit = false;

  categories: CategoryResponseDTO[] = [];

  @ViewChild('pdfInput') pdfInput!: ElementRef<HTMLInputElement>;

  constructor(
    private txApi: TransactionService,
    private planApi: PlannedTxService,
    private catApi: CategoryService,
    private revApi: RevolutService,
    private themeService: ThemeService,
    private notifications: NotificationService
  ) { }

  ngOnInit(): void {
    this.theme = this.themeService.initTheme();

    this.catApi.listAll()
      .pipe(
        catchError(() =>
          of({ data: [] } as unknown as ServiceResponseDTO<CategoryResponseDTO[]>)
        )
      )
      .subscribe(r => {
        this.categories = r.data ?? [];
        this.recalcView();
      });

    this.fetchPage(0);
  }

  private handleSave(
    obs$: Observable<{ success?: boolean; message?: string }>,
    successCb: () => void,
    okMsg = 'Operation completed'
  ): void {
    obs$.subscribe({
      next: r => {
        const msg = r?.message ?? okMsg;
        const isOk = r?.success ?? true;
        this.notifications.notify(msg, isOk ? 'success' : 'error');
        if (isOk) { successCb(); }
      },
      error: () => this.notifications.notify('Request failed', 'error'),
    });
  }

  private catName(id?: number | null) {
    return this.categories.find(c => c.id === id)?.name ?? 'General';
  }

  fetchPage(page: number) {
    this.currentPage = page;
    const month = new Date().toISOString().slice(0, 7);
    const from = `${month}-01`, to = `${month}-31`;

    combineLatest({
      tx: this.txApi.page(page, this.size)
        .pipe(catchError(() => of({ data: { items: [], total: 0 } } as any))),
      plan: this.planApi.list(undefined, from, to)
        .pipe(catchError(() => of({ data: [] } as any)))
    }).subscribe(({ tx, plan }) => {
      const reg = (tx.data?.items ?? []).map(this.mapRegular);
      const pla = (plan.data ?? []).map(this.mapPlanned);
      this.items = [...reg, ...pla]
        .filter(Boolean)
        .sort((a, b) => +b.date - +a.date);
      this.totalPages = Math.max(1, Math.ceil((tx.data?.total ?? 0) / this.size));
      this.recalcView();
    });
  }

  private mapRegular = (t: TxResponseDTO): UITransaction => {
    const txTime = safeDate(t.txTime);
    if (!txTime) return null as any;
    return {
      id: String(t.id),
      type: t.type === 'E' ? 'expense' : 'income',
      amount: +t.amount,
      categoryId: t.categoryId,
      category: this.catName(t.categoryId),
      date: txTime,
      note: t.note,
      planned: false,
      categoryIcon: iconFor(this.catName(t.categoryId)),
      hasFull: true,
    };
  };
  private mapPlanned = (p: PlannedTxResponseDTO): UITransaction => {
    const due = safeDate(p.dueDate);
    if (!due) return null as any;
    return {
      id: `p-${p.id}`,
      type: p.type === 'E' ? 'expense' : 'income',
      amount: +p.amount,
      categoryId: p.categoryId,
      category: p.title,
      date: due,
      note: '',
      planned: true,
      categoryIcon: iconFor(p.title),
      hasFull: true,
    };
  };

  private get filtersActive(): boolean {
    const { type, from, to, min, max, recurring } = this.f;
    return !!(
      this.searchTxt || type || from || to ||
      min != null || max != null || recurring
    );
  }

  recalcView(): void {
    if (this.mode === 'calendar') {
      const mStart = startOfMonth(new Date());
      this.viewTx = this.items.filter(
        t => t.planned && isSameMonth(t.date, mStart)
      );
    }

    else {
      const { type, from, to, min, max, recurring } = this.f;
      const q = this.searchTxt.toLowerCase();

      const filtered = this.items.filter(t => {
        if (q && ![t.category, t.note].some(v => v?.toLowerCase().includes(q)))
          return false;
        if (type && t.type !== type) return false;
        if ((from && t.date < new Date(from)) ||
          (to && t.date > new Date(to)))
          return false;
        if ((min != null && t.amount < min) ||
          (max != null && t.amount > max))
          return false;
        if (recurring && !t.planned) return false;
        if (!recurring && t.planned) return false;
        return true;
      });

      if (this.filtersActive) {
        this.filteredPages = Math.max(1, Math.ceil(filtered.length / this.size));
        if (this.currentPage >= this.filteredPages) this.currentPage = 0;
        const start = this.currentPage * this.size;
        this.viewTx = filtered.slice(start, start + this.size);
      } else {
        this.filteredPages = 1;
        this.viewTx = filtered;
      }
    }

    this.groups = this.viewTx.reduce((m, t) => {
      const k = startOfDay(t.date).toDateString();
      (m[k] ??= []).push(t);
      return m;
    }, {} as Record<string, UITransaction[]>);
  }

  get displayPages() {
    return this.filtersActive ? this.filteredPages : this.totalPages;
  }
  get groupKeys() {
    return Object.keys(this.groups)
      .sort((a, b) => +new Date(b) - +new Date(a));
  }

  clearFilters() {
    this.searchTxt = '';
    this.f = { type: '', from: '', to: '', min: null, max: null, recurring: false };
    this.currentPage = 0;
    this.recalcView();
  }

  handleDatePick(d: Date) {
    const from = startOfDay(d);
    this.f.from = format(from, 'yyyy-MM-dd');
    this.f.to = format(addDays(from, 1), 'yyyy-MM-dd');
    this.currentPage = 0;
    this.mode = 'list';
  }

  nextPage() {
    if (this.currentPage + 1 >= this.displayPages) return;

    if (this.filtersActive) {
      this.currentPage++;
      this.recalcView();
    } else {
      this.fetchPage(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage === 0) return;

    if (this.filtersActive) {
      this.currentPage--;
      this.recalcView();
    } else {
      this.fetchPage(this.currentPage - 1);
    }
  }

  openView(t: UITransaction) { this.selected = { ...t }; this.modalMode = 'view'; }
  openDelete(t: UITransaction) { this.selected = { ...t }; this.modalMode = 'delete'; }

  confirmDelete(): void {
    if (!this.selected) { return; }

    const id = +this.selected.id.replace(/^p-/, '');
    const req$ = this.selected.planned
      ? this.planApi.delete(id)
      : this.txApi.delete(id);

    this.handleSave(req$, () => this.afterSave(), 'Transaction deleted');
  }

  private getLocation(): Promise<{ lat: number, lon: number } | null> {
    return new Promise(res => {
      navigator.geolocation.getCurrentPosition(
        p => res({ lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6) }),
        _ => res(null),
        { enableHighAccuracy: true, timeout: 10_000 }
      );
    });
  }

  openEdit(t: UITransaction): void {
    this.loadingEdit = true;
    this.selected = { ...t };

    const open = (data: any, mode: ModalMode) => {
      this.editForm = { ...data };
      this.modalMode = mode;
      this.loadingEdit = false;
    };

    if (t.planned) {
      open(
        {
          id: t.id.slice(2),
          type: t.type,
          amount: t.amount,
          categoryId: t.categoryId,
          title: t.category,
          date: t.date.toISOString().slice(0, 10),
          note: '',
        },
        'planEdit'
      );
    } else if (t.hasFull) {
      open(
        {
          id: t.id,
          type: t.type,
          amount: t.amount,
          categoryId: t.categoryId,
          date: t.date.toISOString().slice(0, 16),
          note: t.note || '',
        },
        'fullEdit'
      );
    } else {
      this.txApi.getById(+t.id).subscribe((r) => {
        const full = r.data;
        open(
          {
            id: String(full.id),
            type: full.type === 'E' ? 'expense' : 'income',
            amount: +full.amount,
            categoryId: full.categoryId,
            date: new Date(full.txTime).toISOString().slice(0, 16),
            note: full.note || '',
          },
          'fullEdit'
        );
      });
    }
  }

  /* ----------------------------------------------------------------- *
   * saveEdit — never attempts to read or send GPS coordinates.
   * ----------------------------------------------------------------- */
  async saveEdit(frm: NgForm): Promise<void> {
    if (frm.invalid) return;

    if (this.modalMode === 'quickEdit' || this.modalMode === 'fullEdit') {
      const dto: FullTxRequestDTO = {
        type: this.editForm.type === 'expense' ? 'E' : 'I',
        amount: +this.editForm.amount,
        categoryId: +this.editForm.categoryId,
        txTime: new Date(this.editForm.date),
        note: this.editForm.note || '',
      };
      this.handleSave(
        this.txApi.patch(+this.editForm.id, dto),
        () => this.afterSave(),
        'Transaction updated'
      );
    } else {
      const dto: PlannedTxRequestDTO = {
        type: this.editForm.type === 'expense' ? 'E' : 'I',
        categoryId: +this.editForm.categoryId,
        title: this.editForm.title,
        amount: +this.editForm.amount,
        dueDate: new Date(this.editForm.date) as any,
        autoBook: false,
      };
      this.handleSave(
        this.planApi.update(+this.editForm.id, dto),
        () => this.afterSave(),
        'Planned item updated'
      );
    }
  }

  addTx() {
    this.modalMode = 'newTx';
    this.editForm = {
      type: 'expense', amount: 0, categoryId: null,
      date: new Date().toISOString().slice(0, 16),
      note: '', useGeo: false,
      latitude: null, longitude: null
    };
  }

  addPlanned() {
    this.modalMode = 'newPlan';
    this.editForm = {
      type: 'expense', amount: 0, categoryId: null,
      title: '', date: new Date().toISOString().slice(0, 10),
      note: '', useGeo: false,
      latitude: null, longitude: null
    };
  }

  async saveNew(frm: NgForm) {
    if (frm.invalid) return;

    if (this.editForm.useGeo && (!this.editForm.latitude || !this.editForm.longitude)) {
      const pos = await this.getLocation();
      if (pos) { this.editForm.latitude = pos.lat; this.editForm.longitude = pos.lon; }
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
      this.handleSave(this.txApi.create(dto), () => this.afterSave(), 'Transaction added');
    } else {
      const dto: PlannedTxRequestDTO = {
        type: this.editForm.type === 'expense' ? 'E' : 'I',
        categoryId: +this.editForm.categoryId,
        title: this.editForm.title,
        amount: +this.editForm.amount,
        dueDate: new Date(this.editForm.date) as any,
        autoBook: false
      };
      this.handleSave(this.planApi.create(dto), () => this.afterSave(), 'Planned item added');
    }
  }

  isEdit(): boolean { return ['quickEdit', 'fullEdit', 'planEdit'].includes(this.modalMode); }
  isNew(): boolean { return ['newTx', 'newPlan'].includes(this.modalMode); }

  afterSave() {
    this.closeModal();
    this.fetchPage(this.currentPage);
  }

  closeModal() {
    this.modalMode = 'view';
    this.selected = null;
    this.editForm = {};
    this.loadingEdit = false;
  }

  handlePdfChosen(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.handleSave(this.revApi.importPdf(file), () => this.fetchPage(this.currentPage), 'Revolut PDF imported');
    (e.target as HTMLInputElement).value = '';
    this.fabOpen = false;
  }
}
