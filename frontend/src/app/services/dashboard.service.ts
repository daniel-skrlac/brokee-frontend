import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { ServiceResponse } from '../models/service-response';
import {
  DashboardData,
  DailyExpensePoint,
  MonthlyExpensePoint,
} from '../models/dashboard';

// later, when you wire up GraphQL:
// import { Apollo } from 'apollo-angular';
// import gql from 'graphql-tag';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  // constructor(private apollo: Apollo) {}

  getDashboard(): Observable<ServiceResponse<DashboardData>> {
    // --- DUMMY DATA: swap out for a real GraphQL call later ---
    const dailyExpenses: DailyExpensePoint[] = [
      { date: '2025-07-15', amount: 50 },
      { date: '2025-07-16', amount: 80 },
      { date: '2025-07-17', amount: 35 },
      { date: '2025-07-18', amount: 95 },
      { date: '2025-07-19', amount: 60 },
      { date: '2025-07-20', amount: 120 },
      { date: '2025-07-21', amount: 30 },
    ];

    const monthlyExpenses: MonthlyExpensePoint[] = [
      { month: 'Jan', amount: 500 },
      { month: 'Feb', amount: 450 },
      { month: 'Mar', amount: 600 },
      { month: 'Apr', amount: 550 },
      { month: 'May', amount: 620 },
      { month: 'Jun', amount: 700 },
      { month: 'Jul', amount: 400 },
    ];

    const dummyData: DashboardData = {
      balance: 1234.56,
      totalIncome: 2500,
      totalExpense: 1265.44,
      dailyExpenses,
      monthlyExpenses,
    };

    const response: ServiceResponse<DashboardData> = {
      success: true,
      message: 'OK',
      statusCode: 200,
      data: dummyData,
    };

    return of(response).pipe(delay(300));
  }

  /*
  // Example GraphQL implementation for later:
  private GET_DASHBOARD = gql`
    query GetDashboard {
      dashboard {
        balance
        totalIncome
        totalExpense
        dailyExpenses { date, amount }
        monthlyExpenses { month, amount }
      }
    }
  `;

  getDashboard(): Observable<ServiceResponse<DashboardData>> {
    return this.apollo.watchQuery<{ dashboard: DashboardData }>({
      query: this.GET_DASHBOARD
    })
    .valueChanges
    .pipe(
      map(result => ({
        success: true,
        message: '',
        statusCode: 200,
        data: result.data.dashboard
      }))
    );
  }
  */
}
