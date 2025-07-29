import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    ServiceResponseDTO,
    TxResponseDTO,
    QuickTxRequestDTO,
    BudgetResponseDTO,
    PagedResponseDTO,
    PlannedTxResponseDTO
} from '../api/dtos';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class HomeService {
    private readonly base = `${environment.apiUrl}/transactions`;
    private readonly budgetBase = `${environment.apiUrl}/budgets`;
    private readonly plannedBase = `${environment.apiUrl}/planned-transactions`;

    constructor(private http: HttpClient) { }

    getBalance(): Observable<ServiceResponseDTO<number>> {
        return this.http.get<ServiceResponseDTO<number>>(
            `${this.base}/balance`
        );
    }

    getRecent(limit: number = 5): Observable<ServiceResponseDTO<TxResponseDTO[]>> {
        const params = new HttpParams().set('limit', limit.toString());
        return this.http.get<ServiceResponseDTO<TxResponseDTO[]>>(
            `${this.base}/recent`, { params }
        );
    }

    quickAdd(dto: QuickTxRequestDTO): Observable<ServiceResponseDTO<TxResponseDTO>> {
        return this.http.post<ServiceResponseDTO<TxResponseDTO>>(
            `${this.base}/quick`, dto
        );
    }

    getByDateRange(from: string, to: string)
        : Observable<ServiceResponseDTO<TxResponseDTO[]>> {
        const params = new HttpParams()
            .set('from', from)
            .set('to', to);
        return this.http.get<ServiceResponseDTO<TxResponseDTO[]>>(
            `${this.base}/range`, { params }
        );
    }

    getDailyGraph(days: number = 7)
        : Observable<ServiceResponseDTO<Record<string, number>>> {
        const params = new HttpParams().set('days', days.toString());
        return this.http.get<ServiceResponseDTO<Record<string, number>>>(
            `${this.base}/graph/daily`, { params }
        );
    }

    getMonthlyGraph(year?: number)
        : Observable<ServiceResponseDTO<Record<string, number>>> {
        let params = new HttpParams();
        if (year != null) {
            params = params.set('year', year.toString());
        }
        return this.http.get<ServiceResponseDTO<Record<string, number>>>(
            `${this.base}/graph/monthly`, { params }
        );
    }

    getAllBudgets(): Observable<ServiceResponseDTO<PagedResponseDTO<BudgetResponseDTO>>> {
        const params = new HttpParams()
            .set('page', '0')
            .set('size', '10000');
        return this.http.get<ServiceResponseDTO<PagedResponseDTO<BudgetResponseDTO>>>(
            this.budgetBase,
            { params }
        );
    }

    getUpcomingBills(dueFrom: string, dueTo: string)
        : Observable<ServiceResponseDTO<PlannedTxResponseDTO[]>> {
        const params = new HttpParams()
            .set('dueFrom', dueFrom)
            .set('dueTo', dueTo);
        return this.http.get<ServiceResponseDTO<PlannedTxResponseDTO[]>>(
            this.plannedBase,
            { params }
        );
    }
}
