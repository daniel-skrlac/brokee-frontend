import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ServiceResponseDTO,
  SpendingVsIncomeDTO,
  LocationDTO,
  CategoryBreakdownDTO,
} from '../api/dtos';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly base = `${environment.apiUrl}/transactions`;

  constructor(private http: HttpClient) {}

  getSpendingVsIncome(year: number): Observable<ServiceResponseDTO<SpendingVsIncomeDTO[]>> {
    const params = new HttpParams().set('year', year.toString());
    return this.http.get<ServiceResponseDTO<SpendingVsIncomeDTO[]>>(
      `${this.base}/spending-vs-income`,
      { params }
    );
  }

  getTopLocations(limit: number = 3): Observable<ServiceResponseDTO<LocationDTO[]>> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ServiceResponseDTO<LocationDTO[]>>(
      `${this.base}/top-locations`,
      { params }
    );
  }

  getDailyExpenses(days: number = 30): Observable<ServiceResponseDTO<Record<string, number>>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ServiceResponseDTO<Record<string, number>>>(
      `${this.base}/graph/daily`,
      { params }
    );
  }

  getMonthlyExpenses(year: number): Observable<ServiceResponseDTO<Record<string, number>>> {
    const params = new HttpParams().set('year', year.toString());
    return this.http.get<ServiceResponseDTO<Record<string, number>>>(
      `${this.base}/graph/monthly`,
      { params }
    );
  }

  getCategoryBreakdown(monthKey: string): Observable<ServiceResponseDTO<CategoryBreakdownDTO[]>> {
    return this.http.get<ServiceResponseDTO<CategoryBreakdownDTO[]>>(
      `${this.base}/category-breakdown`,
      { params: new HttpParams().set('month', monthKey) }
    );
  }
}
