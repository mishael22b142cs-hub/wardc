import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CivicRequestService {
    private apiUrl = `${environment.apiUrl}/api/civic-requests`;

    constructor(private http: HttpClient) { }

    createRequest(requestData: any): Observable<any> {
        return this.http.post(this.apiUrl, requestData);
    }

    getRequests(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    updateRequestStatus(id: number, data: { status: string, adminResponse: string }): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/status`, data);
    }

    getNotifications(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/notifications`);
    }

    markNotificationsAsRead(): Observable<any> {
        return this.http.put(`${this.apiUrl}/notifications/read`, {});
    }
}
