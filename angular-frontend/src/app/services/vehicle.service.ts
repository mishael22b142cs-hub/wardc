import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
    providedIn: 'root'
})
export class VehicleService {
    private apiUrl = `${environment.apiUrl}/api/vehicle`; // Adjust port if needed

    constructor(private http: HttpClient) { }

    // Owner APIs
    addVehicle(vehicleData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/add`, vehicleData);
    }

    getMyVehicles(ownerId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my-vehicles/${ownerId}`);
    }

    updateAvailability(vehicleId: number, isAvailable: boolean): Observable<any> {
        return this.http.put(`${this.apiUrl}/${vehicleId}/availability`, { isAvailable });
    }

    deleteVehicle(vehicleId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${vehicleId}`);
    }

    // User APIs
    searchVehicles(type?: string): Observable<any[]> {
        let url = `${this.apiUrl}/search`;
        if (type) {
            url += `?type=${type}`;
        }
        return this.http.get<any[]>(url);
    }

    bookVehicle(bookingData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/book`, bookingData);
    }

    emergencySos(data: { userId: number, latitude: number, longitude: number }): Observable<any> {
        return this.http.post(`${this.apiUrl}/emergency`, data);
    }

    updateLocation(vehicleId: number, latitude: number, longitude: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/update-location/${vehicleId}`, { latitude, longitude });
    }

    getOwnerRequests(ownerId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/requests/${ownerId}`);
    }

    respondToBooking(bookingId: number, status: string, amount?: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/respond`, { bookingId, status, amount });
    }

    getBookingStatus(bookingId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/booking/${bookingId}`);
    }

    getUserHistory(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/history/user/${userId}`);
    }



    getOwnerHistory(ownerId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/history/owner/${ownerId}`);
    }

    // --- Helper Methods for Price Estimation ---

    rateVehicle(bookingId: number, rating: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/rate`, { bookingId, rating });
    }

    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return parseFloat(d.toFixed(2));
    }

    deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    estimatePrice(distanceKm: number, vehicleType: string): number {
        switch (vehicleType.toLowerCase()) {
            case 'auto': {
                // Min charge ₹30 for 1.5 km, then ₹15 per km extra
                const minCharge = 30;
                const minKm = 1.5;
                const perKmRate = 15;
                if (distanceKm <= minKm) return minCharge;
                return Math.ceil(minCharge + (distanceKm - minKm) * perKmRate);
            }
            case 'jeep': {
                // Min charge ₹100 for 4 km, then ₹20 per km extra
                const minCharge = 100;
                const minKm = 4;
                const perKmRate = 20;
                if (distanceKm <= minKm) return minCharge;
                return Math.ceil(minCharge + (distanceKm - minKm) * perKmRate);
            }
            case 'taxi': {
                // Min ₹300 for 5 km, then ₹20 per km extra
                const minCharge = 300;
                const minKm = 5;
                const perKmRate = 20;
                if (distanceKm <= minKm) return minCharge;
                return Math.ceil(minCharge + (distanceKm - minKm) * perKmRate);
            }
            case 'ambulance': {
                // Min ₹400 for 20 km, then ₹30 per km extra
                const minCharge = 400;
                const minKm = 20;
                const perKmRate = 30;
                if (distanceKm <= minKm) return minCharge;
                return Math.ceil(minCharge + (distanceKm - minKm) * perKmRate);
            }
            case 'bus': {
                // Min booking above 20 km required, ₹5 per km (min ₹100 for 20 km)
                const minKm = 20;
                const perKmRate = 5;
                const minCharge = minKm * perKmRate; // ₹100
                if (distanceKm < minKm) return minCharge; // Show min even if less
                return Math.ceil(distanceKm * perKmRate);
            }
            default: {
                return Math.ceil(distanceKm * 10);
            }
        }
    }
}
