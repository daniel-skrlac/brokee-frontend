import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    ServiceResponseDTO,
    CategoryResponseDTO
} from '../api/dtos';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    private readonly url = `${environment.apiUrl}/categories`;

    constructor(private http: HttpClient) { }

    listAll(): Observable<ServiceResponseDTO<CategoryResponseDTO[]>> {
        return this.http.get<ServiceResponseDTO<CategoryResponseDTO[]>>(this.url);
    }

    search(name: string): Observable<ServiceResponseDTO<CategoryResponseDTO[]>> {
        const params = new HttpParams().set('name', name);
        return this.http.get<ServiceResponseDTO<CategoryResponseDTO[]>>(
            this.url, { params }
        );
    }
}
