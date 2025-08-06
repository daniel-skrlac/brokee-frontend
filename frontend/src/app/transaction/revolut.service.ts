import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { ServiceResponseDTO } from '../api/dtos';

@Injectable({ providedIn: 'root' })
export class RevolutService {
    private base = `${environment.apiUrl}/revolut`;
    constructor(private http: HttpClient) { }

    importPdf(file: File): Observable<ServiceResponseDTO<boolean>> {
        const fd = new FormData(); fd.append('file', file);
        return this.http.post<ServiceResponseDTO<boolean>>(`${this.base}/import`, fd);
    }
}
