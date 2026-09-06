import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KudumbashreeMeeting } from '../models/meeting';
import { Loan } from '../models/loan';
import { Attendance } from '../models/attendance';
import { FinancialTransaction, FinancialReport } from '../models/financial';
import { environment } from '@environments/environment';
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api`;

  // Meeting minutes endpoints
  recordMeetingAudio(meetingId: string, audioBlob: Blob, transcript: string): Observable<any> {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('meetingId', meetingId);
    if (transcript) {
        formData.append('transcript', transcript);
    }
    return this.http.post(`${this.baseUrl}/kudumbashree/meeting/record`, formData);
  }

  getMeetingTranscript(meetingId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/kudumbashree/meeting/${meetingId}/transcript`);
  }

  getProcessingStatus(meetingId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/kudumbashree/meeting/${meetingId}/status`);
  }

  // Attendance endpoints
  markAttendance(attendanceData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/kudumbashree/attendance`, attendanceData);
  }

  getAttendanceByMeeting(meetingId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/kudumbashree/attendance/by-meeting/${meetingId}`);
  }

  getAttendanceHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/kudumbashree/attendance/user-history`);
  }

  getAttendanceSummary(meetingId: number | string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/kudumbashree/attendance/summary/${meetingId}`);
  }

  adminSubmitAttendance(meetingId: number | string, adminCount: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/kudumbashree/attendance/admin-submit/${meetingId}`, { adminCount });
  }

  // Loan management endpoints
  applyLoan(loanData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/kudumbashree/loan/apply`, loanData);
  }

  getLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.baseUrl}/kudumbashree/loan`);
  }

  // Member profile
  getMemberProfile(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/kudumbashree/member/profile`);
  }

  // Meeting organizer endpoints
  scheduleMeeting(meetingData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/kudumbashree/meeting/schedule`, meetingData);
  }

  getMeetings(type: 'active' | 'history' = 'active'): Observable<KudumbashreeMeeting[]> {
    return this.http.get<KudumbashreeMeeting[]>(`${this.baseUrl}/kudumbashree/meeting?type=${type}`);
  }

  deleteMeeting(meetingId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/kudumbashree/meeting/${meetingId}`);
  }


  // Attendance with payment
  markAttendanceWithPayment(attendanceData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/kudumbashree/attendance/mark-with-payment`, attendanceData);
  }

  generatePaymentQR(attendanceId: string, amount: number): Observable<{ qrCode: string; transactionId: string }> {
    return this.http.post<{ qrCode: string; transactionId: string }>(
      `${this.baseUrl}/kudumbashree/attendance/generate-payment-qr`,
      { attendanceId, amount }
    );
  }

  createRazorpayOrder(amount: number): Observable<any> {
      return this.http.post(`${this.baseUrl}/kudumbashree/financial/create-order`, { amount });
  }

  verifyRazorpayPayment(paymentData: any): Observable<any> {
      return this.http.post(`${this.baseUrl}/kudumbashree/financial/verify-payment`, paymentData);
  }

  getUserTransactions(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/kudumbashree/financial/user-transactions/${userId}`);
  }

  verifyPayment(transactionId: string): Observable<{ verified: boolean; transaction: any }> {
    return this.http.get<{ verified: boolean; transaction: any }>(
      `${this.baseUrl}/kudumbashree/financial/verify/${transactionId}`
    );
  }

  // Financial reports
  getFinancialReport(dateRange: any): Observable<FinancialReport> {
    return this.http.post<FinancialReport>(`${this.baseUrl}/kudumbashree/report/financial/report`, dateRange); // Check reportRoutes.js for exact path if needed, usually it's report-controller related
  }

  getAttendanceCollections(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/kudumbashree/financial/attendance-collections`);
  }

  recordPayment(paymentData: any): Observable<FinancialTransaction> {
    return this.http.post<FinancialTransaction>(`${this.baseUrl}/kudumbashree/financial/record-payment`, paymentData);
  }
}
