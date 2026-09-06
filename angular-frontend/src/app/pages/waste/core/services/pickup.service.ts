import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import {
  PickupRequest,
  PickupType, 
  PickupStatus, 
  SchedulePickupData, 
  BulkPickupData,
  AdminSchedulePickupData
} from '../models/pickup.model';

@Injectable({
  providedIn: 'root'
})
export class PickupService {
  private pickupsSubject = new BehaviorSubject<PickupRequest[]>([]);
  public pickups$ = this.pickupsSubject.asObservable();
  private apiUrl = `${environment.apiUrl}/api/waste/pickups`;

  constructor(private http: HttpClient) {}

  scheduleAdminPickup(data: AdminSchedulePickupData): Observable<PickupRequest> {
    return this.http.post<PickupRequest>(`${this.apiUrl}/admin-schedule`, {
      ...data,
      type: PickupType.REGULAR,
      isAdminScheduled: true
    }).pipe(
      map(pickup => {
        const current = this.pickupsSubject.value;
        this.pickupsSubject.next([...current, pickup]);
        return pickup;
      })
    );
  }

  getPickupsByHouseNumber(houseNumber: string): Observable<PickupRequest[]> {
     return this.getAllPickups().pipe(
       map(pickups => pickups.filter(p => p.houseNumbers && p.houseNumbers.includes(houseNumber)))
     );
  }

  getAvailableHouseNumbers(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/api/users/house-numbers`);
  }

  schedulePickup(userId: string, userName: string, data: SchedulePickupData): Observable<PickupRequest> {
    return this.http.post<PickupRequest>(this.apiUrl, {
      ...data,
      type: PickupType.REGULAR
    }).pipe(
      map(pickup => {
        const current = this.pickupsSubject.value;
        this.pickupsSubject.next([...current, pickup]);
        return pickup;
      })
    );
  }

  scheduleBulkPickup(userId: string, userName: string, data: BulkPickupData): Observable<PickupRequest> {
    return this.http.post<PickupRequest>(this.apiUrl, {
      ...data,
      type: PickupType.BULK
    }).pipe(
      map(pickup => {
        const current = this.pickupsSubject.value;
        this.pickupsSubject.next([...current, pickup]);
        return pickup;
      })
    );
  }

  getUserPickups(userId: string): Observable<PickupRequest[]> {
    return this.http.get<PickupRequest[]>(this.apiUrl).pipe(
      map(pickups => {
        this.pickupsSubject.next(pickups);
        return pickups;
      })
    );
  }

  getAllPickups(): Observable<PickupRequest[]> {
    return this.http.get<PickupRequest[]>(this.apiUrl).pipe(
       map(pickups => {
        this.pickupsSubject.next(pickups);
        return pickups;
      })
    );
  }

  getPickupById(id: string): Observable<PickupRequest | undefined> {
    return this.getAllPickups().pipe(
      map(pickups => pickups.find(p => p.id.toString() === id.toString()))
    );
  }

  confirmPickup(id: string): Observable<PickupRequest> {
    return this.updatePickupStatus(id, PickupStatus.CONFIRMED);
  }

  assignVehicle(id: string, vehicleNumber: string): Observable<PickupRequest> {
    return this.http.put<PickupRequest>(`${this.apiUrl}/${id}`, {
      status: PickupStatus.CONFIRMED,
      assignedVehicle: vehicleNumber
    });
  }

  updatePickupStatus(id: string, status: PickupStatus): Observable<PickupRequest> {
    return this.http.put<PickupRequest>(`${this.apiUrl}/${id}`, { status });
  }

  cancelPickup(id: string): Observable<PickupRequest> {
    return this.updatePickupStatus(id, PickupStatus.CANCELLED);
  }

  acknowledgePickup(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/acknowledge`, {});
  }

  getNotificationCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/notifications`);
  }

  deletePickup(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
