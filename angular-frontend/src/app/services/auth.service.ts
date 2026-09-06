import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiUrl}/auth`;
    private userSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('user') || 'null'));
    user$ = this.userSubject.asObservable();

    constructor(
        private http: HttpClient, 
        private router: Router
    ) { }

    sendOtp(phoneNumber: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/send-otp`, { mobile_number: phoneNumber });
    }

    // --- Backend API Methods ---

    signup(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/signup`, data);
    }

    verifyOtp(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/verify-otp`, data);
    }

    resetPassword(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/reset-password`, data);
    }

    login(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/login`, data).pipe(
            tap((res: any) => {
                if (res.token) {
                    localStorage.setItem('token', res.token);
                    localStorage.setItem('user', JSON.stringify(res.user));
                    this.userSubject.next(res.user);
                }
            })
        );
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.userSubject.next(null);
        this.router.navigate(['/login']);
    }

    updateUser(user: any) {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
            this.userSubject.next(user);
        }
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    getCurrentUser(): any {
        return this.userSubject.value;
    }

    get currentUserValue(): any {
        return this.userSubject.value;
    }

    isLoggedIn(): boolean {
        return !!this.userSubject.value;
    }

    hasRole(role: string): boolean {
        const user = this.getCurrentUser();
        // Map waste roles to Ward Connect roles if needed
        if (role === 'admin') return user?.role === 'Waste Management Staff';
        if (role === 'user') return user?.role === 'Citizen';
        return user?.role === role;
    }

    isAdmin(): boolean {
        return this.hasRole('Waste Management Staff') || this.hasRole('admin');
    }

    isUser(): boolean {
        return this.hasRole('Citizen') || this.hasRole('user');
    }
}
