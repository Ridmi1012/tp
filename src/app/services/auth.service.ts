import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private registerUrl = 'http://localhost:8083/api/customers';
  private loginUrl = 'http://localhost:8083/api/auth/login';

  constructor(private http: HttpClient) { }

  register(userData: any): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.registerUrl, userData, { headers });
  }

  login(username: string, password: string): Observable<any> {
    const loginPayload = { username, password };
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post<any>(this.loginUrl, loginPayload, { headers });
  }

  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  getToken(): string {
    // Fix: Use 'authToken' consistently instead of 'token'
    return localStorage.getItem('authToken') || '';
  }

  logout(): void {
    localStorage.removeItem('authToken');
  }

  isLoggedIn(): boolean {
    return !!this.getToken(); // Returns true if token exists
  }

  saveUserType(userType: string): void {
  localStorage.setItem('userType', userType);
  }

    getUserType(): string {
  return localStorage.getItem('userType') || '';
  }

  isAdmin(): boolean {
  return this.getUserType() === 'ADMIN';
  }

  isCustomer(): boolean {
  return this.getUserType() === 'CUSTOMER';
  }
}
