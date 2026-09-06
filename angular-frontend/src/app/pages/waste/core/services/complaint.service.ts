import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Complaint, ComplaintStatus, ComplaintData, ComplaintCategory } from '../models/complaint.model';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ComplaintService {
  private complaintsSubject = new BehaviorSubject<Complaint[]>([]);
  public complaints$ = this.complaintsSubject.asObservable();
  private apiUrl = `${environment.apiUrl}/api/waste/complaints`;

  constructor(private http: HttpClient) {}

  submitComplaint(userId: string, userName: string, data: ComplaintData): Observable<Complaint> {
    // Note: for real file upload, use FormData and a separate endpoint or middleware
    // Here we're sending JSON, so we ignore the File object or assume it's handled elsewhere
    return this.http.post<Complaint>(this.apiUrl, {
      title: data.title,
      description: data.description,
      category: data.category,
      location: data.location,
      photoUrl: data.photoUrl || '' 
    }).pipe(
      map(complaint => {
        const current = this.complaintsSubject.value;
        this.complaintsSubject.next([...current, complaint]);
        return complaint;
      })
    );
  }

  getUserComplaints(userId: string): Observable<Complaint[]> {
    return this.getAllComplaints();
  }

  getAllComplaints(): Observable<Complaint[]> {
    return this.http.get<Complaint[]>(this.apiUrl).pipe(
      map(complaints => {
        this.complaintsSubject.next(complaints);
        return complaints;
      })
    );
  }

  getComplaintById(id: string): Observable<Complaint | undefined> {
    return this.getAllComplaints().pipe(
      map(complaints => complaints.find(c => c.id.toString() === id.toString()))
    );
  }

  assignStaff(id: string, staffName: string): Observable<Complaint> {
    return this.http.put<Complaint>(`${this.apiUrl}/${id}/status`, {
      status: ComplaintStatus.ASSIGNED,
      assignedStaff: staffName
    });
  }

  updateStatus(id: string, status: ComplaintStatus, adminResponse?: string): Observable<Complaint> {
    return this.http.put<Complaint>(`${this.apiUrl}/${id}/status`, { status, adminResponse });
  }

  getComplaintStats(): Observable<{ total: number; pending: number; inProgress: number; resolved: number }> {
    return this.getAllComplaints().pipe(
      map(complaints => ({
        total: complaints.length,
        pending: complaints.filter(c => c.status === ComplaintStatus.PENDING).length,
        inProgress: complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length,
        resolved: complaints.filter(c => c.status === ComplaintStatus.RESOLVED).length
      }))
    );
  }

  deleteComplaint(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}




