import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
    providedIn: 'root'
})
export class BillService {
    private apiUrl = `${environment.apiUrl}/api/bills`;

    constructor(private http: HttpClient) { }

    getBills(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}`);
    }

    fetchByConsumer(consumerNumber: string, billType?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/fetch`, { consumerNumber, billType });
    }

    payBill(id: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/pay`, {});
    }

    createOrder(amount: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/create-order`, { amount });
    }

    verifyPayment(paymentData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/verify-payment`, paymentData);
    }
}
