import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private registerUrl = 'http://localhost:8083/api/customers';
  private loginUrl = 'http://localhost:8083/api/auth/login';
  private forgotPasswordUrl = 'http://localhost:8083/api/auth/forgot-password';
  private googleLoginUrl = 'http://localhost:8083/api/auth/google';

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

  // New method for forgot password
  forgotPassword(email: string): Observable<any> {
    const payload = { email };
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post<any>(this.forgotPasswordUrl, payload, { headers });
  }

  // New method for Google login
  googleLogin(): Observable<any> {
    // For actual implementation, you'll need to integrate with Google OAuth
    // This is just a placeholder for the backend API call
    return this.http.get<any>(this.googleLoginUrl);
  }

  // You might need this method to handle Google OAuth redirect
  handleGoogleRedirect(token: string): Observable<any> {
    return this.http.post<any>(`${this.googleLoginUrl}/callback`, { token });
  }

  saveUserDetails(user: any): void {
    localStorage.setItem('userDetails', JSON.stringify(user));
  }
  
  getUserDetails(): any {
    const userDetails = localStorage.getItem('userDetails');
    return userDetails ? JSON.parse(userDetails) : null;
  }

  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  getToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userDetails');
    localStorage.removeItem('userType');
  }

  isLoggedIn(): boolean {
    return !!this.getToken(); 
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
