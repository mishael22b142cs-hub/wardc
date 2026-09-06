import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
    providedIn: 'root'
})
export class HealthService {
    http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/health`;

    // --- Donation Requests ---
    getDonationRequests(filters?: any): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/donations`, { params: filters });
    }

    createDonationRequest(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/donations`, data);
    }

    getUserDonationRequests(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/donations/my`);
    }

    pledgeBloodDonation(requestId: string, unitsDonated: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/donations/${requestId}/pledge`, { unitsDonated });
    }

    cancelDonationRequest(requestId: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/donations/${requestId}/cancel`, {});
    }

    // --- Medicine Reminders ---
    getMedicineReminders(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/medicines`);
    }

    addMedicineReminder(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/medicines`, data);
    }

    deleteMedicineReminder(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/medicines/${id}`);
    }

    // --- Health Records ---
    getHealthRecords(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/records`);
    }

    addHealthRecord(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/records`, data);
    }

    deleteHealthRecord(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/records/${id}`);
    }

    // --- OP Bookings ---
    createOpBooking(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/op-bookings`, data);
    }

    getMyOpBookings(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/op-bookings/user`);
    }

    cancelOpBooking(id: string | number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/op-bookings/${id}`);
    }

    getAllOpBookings(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/op-bookings/all`);
    }

    updateOpBookingStatus(id: string | number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/op-bookings/${id}/status`, data);
    }

    // --- Community Stats ---
    getCommunityStats(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/community-stats`);
    }

    updateCommunityStats(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/community-stats`, data);
    }

    // --- Insurance Schemes ---
    getInsuranceSchemes(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/insurance-schemes`);
    }

    addInsuranceScheme(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/insurance-schemes`, data);
    }
}
