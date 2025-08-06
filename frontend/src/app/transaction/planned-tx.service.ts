import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
    ServiceResponseDTO,
    PlannedTxRequestDTO,
    PlannedTxResponseDTO,
    PagedResponseDTO,
} from '../api/dtos';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class PlannedTxService {
    private readonly base = `${environment.apiUrl}/planned-transactions`;

    constructor(private http: HttpClient) { }

    /** ----------------------------------------------------------------
     *  LIST (un-paged)  – pass what you need, leave the rest `null`
     *  ---------------------------------------------------------------- */
    list(
        title?: string, dueFrom?: string, dueTo?: string,
        type?: string, min?: number, max?: number, cat?: string
    ): Observable<ServiceResponseDTO<PlannedTxResponseDTO[]>> {

        let p = new HttpParams();
        if (title) p = p.set('title', title);
        if (dueFrom) p = p.set('dueFrom', dueFrom);
        if (dueTo) p = p.set('dueTo', dueTo);
        if (type) p = p.set('type', type);
        if (min != null) p = p.set('min', min);
        if (max != null) p = p.set('max', max);
        if (cat) p = p.set('category', cat);

        return this.http.get<ServiceResponseDTO<PlannedTxResponseDTO[]>>(this.base, { params: p });
    }

    /** paged list – same filters plus page/size */
    page(
        page = 0,
        size = 20,
        ...sameArgs: Parameters<PlannedTxService['list']>
    ): Observable<ServiceResponseDTO<PagedResponseDTO<PlannedTxResponseDTO>>> {
        let p = new HttpParams()
            .set('page', page)
            .set('size', size);

        // reuse list()’s arg mapping
        const tmp = new HttpParams();
        const [title, from, to, type, min, max, cat] = sameArgs;
        if (title) p = p.set('title', title);
        if (from) p = p.set('dueFrom', from);
        if (to) p = p.set('dueTo', to);
        if (type) p = p.set('type', type);
        if (min != null) p = p.set('min', min);
        if (max != null) p = p.set('max', max);
        if (cat) p = p.set('category', cat);

        return this.http.get<ServiceResponseDTO<PagedResponseDTO<PlannedTxResponseDTO>>>(
            this.base,
            { params: p },
        );
    }

    /** CRUD ---------------------------------------------------------- */
    create(dto: PlannedTxRequestDTO) {
        return this.http.post<ServiceResponseDTO<PlannedTxResponseDTO>>(
            this.base,
            dto,
        );
    }

    update(id: number, dto: PlannedTxRequestDTO) {
        return this.http.put<ServiceResponseDTO<PlannedTxResponseDTO>>(
            `${this.base}/${id}`,
            dto,
        );
    }

    pdate(id: string | number, dto: PlannedTxRequestDTO) {
        return this.http.put<ServiceResponseDTO<PlannedTxResponseDTO>>(
            `${this.base}/${id}`, dto
        );
    }

    delete(id: number) {
        return this.http.delete<ServiceResponseDTO<boolean>>(
            `${this.base}/${id}`,
        );
    }
}
