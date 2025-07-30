import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    ServiceResponseDTO,
    BinanceTokenDTO,
    FullPortfolioDTO
} from '../api/dtos';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class BinanceService {
    private readonly base = `${environment.apiUrl}/binance`;

    constructor(private http: HttpClient) { }

    getCredentials(): Observable<ServiceResponseDTO<BinanceTokenDTO>> {
        return this.http.get<ServiceResponseDTO<BinanceTokenDTO>>(this.base);
    }

    getPortfolio(currency: string = 'EUR')
        : Observable<ServiceResponseDTO<FullPortfolioDTO>> {
        const params = new HttpParams().set('currency', currency);
        return this.http.get<ServiceResponseDTO<FullPortfolioDTO>>(
            `${this.base}/portfolio`,
            { params }
        );
    }
}
