export interface DailyExpensePoint {
  date: string;
  amount: number;
}

export interface MonthlyExpensePoint {
  month: string;
  amount: number;
}

export interface DashboardData {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  dailyExpenses: DailyExpensePoint[];
  monthlyExpenses: MonthlyExpensePoint[];
}
