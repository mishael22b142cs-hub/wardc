import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core'; // Removed Duplicate Injectable
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { DashboardStats, MemberDashboard, FinancialSummary, Activity } from '../models/dashboard';
import { User, UserRole } from '../models/user';
import { Loan, LoanStatus } from '../models/loan';
import { KudumbashreeMeeting } from '../models/meeting';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`; // Base API URL

  constructor() { }

  getAdminDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/kudumbashree/report/admin-dashboard`);
  }

  getMemberDashboard(userId: string): Observable<MemberDashboard> {
    // Backend uses token to identify user, so userId arg is theoretically redundant if using interceptor
    // but we can keep it signature compatible or just use the endpoint.
    return this.http.get<MemberDashboard>(`${this.apiUrl}/kudumbashree/report/member-dashboard`);
  }

  getFinancialSummary(): Observable<FinancialSummary> {
    return this.http.get<any>(`${this.apiUrl}/kudumbashree/report/admin-dashboard`).pipe(
      map((stats: any) => ({
        totalFunds: 0, // Placeholder
        availableBalance: stats.recoveredAmount || 0,
        totalLoansDisbursed: stats.totalLoanAmount || 0,
        totalRepayments: stats.recoveredAmount || 0,
        pendingCollections: stats.pendingAmount || 0,
        monthlyCollections: [],
        ...stats
      }) as unknown as FinancialSummary)
    );
  }

  approveMember(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/kudumbashree/member/approve/${userId}`, {});
  }

  deleteMember(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/kudumbashree/member/reject/${userId}`, {});
  }

  getAllMembers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/kudumbashree/member/members`);
  }

  generateAiReport(type: string): Observable<{ report: string }> {
    return this.http.post<{ report: string }>(`${this.apiUrl}/kudumbashree/report/ai-report`, { type });
  }
}
