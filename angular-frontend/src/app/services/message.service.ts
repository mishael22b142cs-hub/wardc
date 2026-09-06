import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = `${environment.apiUrl}/api/waste/messages`;

  constructor(private http: HttpClient) { }

  getMyAlerts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-alerts`);
  }

  broadcastMessage(data: { houseNumber: string, message: string, type?: string, expiresAt?: Date }): Observable<any> {
    return this.http.post(`${this.apiUrl}/broadcast`, data);
  }
}
