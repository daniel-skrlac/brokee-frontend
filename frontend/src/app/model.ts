export interface Transaction {
    id: string;
    type: 'expense' | 'income';
    amount: number;
    category: string;
    categoryIcon: string;
    merchant?: string;
    note?: string;
    date: Date;
    paymentMethod?: string;
    isRecurring?: boolean;
    tags?: string[];
    planned?: boolean; 
  }
  
  export interface RecurringRule {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;   
    endDate?: Date; 
  }
  
  export interface PlannedTransaction extends Omit<Transaction, 'id' | 'date'> {
    id: string;
    rule: RecurringRule;
    startDate: Date;
  }
  