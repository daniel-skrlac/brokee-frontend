import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Budget {
  category: string;
  amount: number;
}


@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  // — Basic info (read‑only) —
  userName = 'Daniel';
  userEmail = 'daniel@example.com';

  // — Preferences —
  currencies = ['EUR', 'USD', 'GBP', 'JPY'];
  themes = ['light', 'dark'];
  currency = 'EUR';
  theme = 'light';
  prefsChanged = false;

  // — Monthly budgets —
  budgets: Budget[] = [
    { category: 'Food', amount: 300 },
    { category: 'Transport', amount: 100 },
  ];
  budgetsChanged = false;

  // — Savings goal —
  savingsGoal = {
    amount: 500,
    targetDate: this.toInputDate(new Date(new Date().setMonth(new Date().getMonth() + 3)))
  };
  goalChanged = false;

  ngOnInit() {
    // If you need to load real user settings, do it here.
  }

  // mark changes on ngModelChange
  onCurrencyChange() {
    this.prefsChanged = true;
  }
  onThemeChange() {
    this.prefsChanged = true;
  }

  addBudget() {
    this.budgets.push({ category: '', amount: 0 });
    this.budgetsChanged = true;
  }

  removeBudget(i: number) {
    this.budgets.splice(i, 1);
    this.budgetsChanged = true;
  }

  onBudgetChange() {
    this.budgetsChanged = true;
  }

  onGoalChange() {
    this.goalChanged = true;
  }

  savePrefs() {
    console.log('Saving preferences:', { currency: this.currency, theme: this.theme });
    this.prefsChanged = false;
    // TODO: call your service
  }

  saveBudgets() {
    console.log('Saving budgets:', this.budgets);
    this.budgetsChanged = false;
    // TODO: call your service
  }

  saveGoal() {
    console.log('Saving goal:', this.savingsGoal);
    this.goalChanged = false;
    // TODO: call your service
  }

  private toInputDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
