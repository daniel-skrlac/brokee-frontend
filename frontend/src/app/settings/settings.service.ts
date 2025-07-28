// src/app/services/settings.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
    ServiceResponseDTO,
    PagedResponseDTO,
    BudgetResponseDTO,
    BudgetRequestDTO,
    SavingsGoalResponseDTO,
    SavingsGoalRequestDTO,
    BinanceCredentialDTO,
    BinanceTokenDTO
} from '../api/dtos';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SettingsService {
    private readonly base = `${environment.apiUrl}`;

    constructor(private http: HttpClient) { }

    getBudgets(page = 0, size = 10)
        : Observable<ServiceResponseDTO<PagedResponseDTO<BudgetResponseDTO>>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        return this.http.get<ServiceResponseDTO<PagedResponseDTO<BudgetResponseDTO>>>(
            `${this.base}/budgets`, { params }
        );
    }

    createBudgets(dtos: BudgetRequestDTO[])
        : Observable<ServiceResponseDTO<BudgetResponseDTO[]>> {
        return this.http.post<ServiceResponseDTO<BudgetResponseDTO[]>>(
            `${this.base}/budgets/bulk`, dtos
        );
    }

    updateBudgets(dtos: BudgetRequestDTO[])
        : Observable<ServiceResponseDTO<BudgetResponseDTO[]>> {
        return this.http.patch<ServiceResponseDTO<BudgetResponseDTO[]>>(
            `${this.base}/budgets/bulk`, dtos
        );
    }
    deleteBudgets(categoryIds: number[])
        : Observable<ServiceResponseDTO<boolean>> {
        return this.http.request<ServiceResponseDTO<boolean>>(
            'DELETE',
            `${this.base}/budgets`,
            { body: categoryIds }
        );
    }

    getSavingsGoal()
        : Observable<ServiceResponseDTO<SavingsGoalResponseDTO>> {
        return this.http.get<ServiceResponseDTO<SavingsGoalResponseDTO>>(
            `${this.base}/savings`
        );
    }

    upsertSavingsGoal(dto: SavingsGoalRequestDTO)
        : Observable<ServiceResponseDTO<SavingsGoalResponseDTO>> {
        return this.http.post<ServiceResponseDTO<SavingsGoalResponseDTO>>(
            `${this.base}/savings`, dto
        );
    }

    deleteSavingsGoal(): Observable<ServiceResponseDTO<boolean>> {
        return this.http.delete<ServiceResponseDTO<boolean>>(
            `${this.base}/savings`
        );
    }

    getBinanceCredentials(): Observable<ServiceResponseDTO<BinanceTokenDTO>> {
        return this.http.get<ServiceResponseDTO<BinanceTokenDTO>>(
            `${this.base}/binance`
        );
    }

    upsertBinanceCredentials(dto: BinanceCredentialDTO)
        : Observable<ServiceResponseDTO<BinanceTokenDTO>> {
        return this.http.post<ServiceResponseDTO<BinanceTokenDTO>>(
            `${this.base}/binance`, dto
        );
    }

    deleteBinanceCredentials(): Observable<ServiceResponseDTO<boolean>> {
        return this.http.delete<ServiceResponseDTO<boolean>>(
            `${this.base}/binance`
        );
    }
}
