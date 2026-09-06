import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface AIClassificationResponse {
  category: string;
  confidence: number;
  tips: string;
  analysis: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = `${environment.apiUrl}/api/waste/ai`;

  constructor(private http: HttpClient) {}

  classifyWaste(description: string): Observable<AIClassificationResponse> {
    return this.http.post<AIClassificationResponse>(`${this.apiUrl}/classify`, { description });
  }
}




