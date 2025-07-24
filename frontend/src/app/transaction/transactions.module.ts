import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TransactionComponent }       from './transaction.component';
import { CalendarViewComponent }      from './calendar-view.component';
import { PlannedTransactionsComponent } from './planned-transactions.component';

@NgModule({
  declarations: [
    TransactionComponent
  ],
  imports: [CommonModule, FormsModule, CalendarViewComponent, PlannedTransactionsComponent],
  exports: [TransactionComponent]
})
export class TransactionsModule {}
