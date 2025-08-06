import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
    ServiceResponseDTO,
    PagedResponseDTO,
    TxResponseDTO,
    FullTxRequestDTO,
    QuickTxRequestDTO,
} from '../api/dtos';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class TransactionService {
    private readonly base = `${environment.apiUrl}/transactions`;

    constructor(private http: HttpClient) { }

    /** ----------------------------------------------------------------
     *  PAGED LIST (optionally filtered)
     *  ---------------------------------------------------------------- */
    page(page = 0, size = 100): Observable<ServiceResponseDTO<PagedResponseDTO<TxResponseDTO>>> {
        const params = new HttpParams().set('page', page).set('size', size);
        return this.http.get<ServiceResponseDTO<PagedResponseDTO<TxResponseDTO>>>(this.base, { params });
    }

    /** five most-recent */
    recent(limit = 5): Observable<ServiceResponseDTO<TxResponseDTO[]>> {
        const params = new HttpParams().set('limit', limit);
        return this.http.get<ServiceResponseDTO<TxResponseDTO[]>>(
            `${this.base}/recent`,
            { params },
        );
    }

    /** create / update / delete ------------------------------------------------ */

    create(dto: FullTxRequestDTO) {
        return this.http.post<ServiceResponseDTO<TxResponseDTO>>(this.base, dto);
    }

    quickAdd(dto: QuickTxRequestDTO) {
        return this.http.post<ServiceResponseDTO<TxResponseDTO>>(
            `${this.base}/quick`,
            dto,
        );
    }

    update(id: number, dto: FullTxRequestDTO) {
        return this.http.patch<ServiceResponseDTO<TxResponseDTO>>(
            `${this.base}/${id}`,
            dto,
        );
    }

    delete(id: number) {
        return this.http.delete<ServiceResponseDTO<boolean>>(
            `${this.base}/${id}`,
        );
    }

    getById(id: number) {
        return this.http.get<ServiceResponseDTO<TxResponseDTO>>(`${this.base}/${id}`);
    }

    patch(id: number, dto: FullTxRequestDTO) {
        return this.http.patch<ServiceResponseDTO<TxResponseDTO>>(`${this.base}/${id}`, dto);
    }
}
