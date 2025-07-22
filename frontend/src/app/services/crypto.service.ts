// src/app/services/crypto.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

interface CryptoApiResponse {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
}

export interface Crypto {
  name: string;
  symbol: string;
  price: number;
  rise: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  private apiUrl = 'https://api.coingecko.com/api/v3/coins/markets';

  constructor(private http: HttpClient) {}

  /** 
   * Fetch top N cryptos by market cap, with 24h price change. 
   */
  getTopCryptos(limit: number = 5): Observable<Crypto[]> {
    const params = new HttpParams()
      .set('vs_currency', 'usd')
      .set('order', 'market_cap_desc')
      .set('per_page', limit.toString())
      .set('page', '1')
      .set('price_change_percentage', '24h');

    return this.http
      .get<CryptoApiResponse[]>(this.apiUrl, { params })
      .pipe(
        map(list =>
          list.map(item => ({
            name: item.name,
            symbol: item.symbol,
            price: item.current_price,
            rise: item.price_change_percentage_24h >= 0
          }))
        )
      );
  }
}
