import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable  , of, throwError, BehaviorSubject} from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8083/api';
  private registerUrl = `${this.apiUrl}/customers`;
  private loginUrl = `${this.apiUrl}/auth/login`;
  private changePasswordUrl = `${this.apiUrl}/password/change`;
  private adminUrl = `${this.apiUrl}/admin`;
  
  // Subject to notify subscribers about authentication changes
  private authChangeSubject = new BehaviorSubject<boolean>(this.isLoggedIn());
  public authChange = this.authChangeSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  register(userData: any): Observable<any> {
    // Remove confirmPassword from the payload as the backend doesn't need it
    const { confirmPassword, ...userDataToSend } = userData;
    
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.post(this.registerUrl, userDataToSend, { headers }).pipe(
      tap(response => console.log('Registration successful', response)),
      catchError(error => {
        console.error('Registration failed', error);
        return throwError(() => error);
      })
    );
  }

  login(username: string, password: string): Observable<any> {
    const loginPayload = { username, password };
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.post<any>(this.loginUrl, loginPayload, { headers }).pipe(
      tap(response => {
        console.log('Login successful', response);
        if (response.token) {
          this.saveToken(response.token);
          this.saveUserType(response.userType);
          
          // Save additional user details - ensure customerId is saved
          this.saveUserDetails({
            firstName: response.firstName,
            lastName: response.lastName,
            customerId: response.userId, // Ensure this is saved as customerId
            userId: response.userId,
            username: username
          });
          
          // Notify subscribers about auth change
          this.authChangeSubject.next(true);
        }
      }),
      catchError(error => {
        console.error('Login failed', error);
        return throwError(() => error);
      })
    );
  }

  // Change password method
  changePassword(username: string, currentPassword: string, newPassword: string): Observable<any> {
    const payload = { 
      username, 
      currentPassword, 
      newPassword 
    };
    
    const headers = this.getAuthHeaders();
    
    return this.http.post(this.changePasswordUrl, payload, { headers }).pipe(
      tap(response => console.log('Password changed successfully', response)),
      catchError(error => {
        console.error('Password change failed', error);
        return throwError(() => error);
      })
    );
  }

  saveUserDetails(user: any): void {
    localStorage.setItem('userDetails', JSON.stringify(user));
  }
  
  getUserDetails(): any {
    const userDetails = localStorage.getItem('userDetails');
    return userDetails ? JSON.parse(userDetails) : null;
  }

  // Get the customer ID for the edit profile link
  getCustomerId(): number | null {
    const userDetails = this.getUserDetails();
    // Try to get customerId or userId as fallback
    return userDetails ? (userDetails.customerId || userDetails.userId) : null;
  }

  getCurrentUser(): Observable<any> {
    // Return user data from localStorage as an Observable
    const userDetails = this.getUserDetails();
    return of(userDetails);
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
    
    // Notify subscribers about auth change
    this.authChangeSubject.next(false);
    
    // Redirect to login page
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    // You could add token expiration validation here
    return !!token; 
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

  // Helper method to get authorization headers with token
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`);
  }

  // Helper method for item management permissions
  canModifyItems(): boolean {
    return this.isAdmin();
  }

  // Admin-specific methods
  getTodayEventsCount(): Observable<number> {
    const headers = this.getAuthHeaders();
    return this.http.get<number>(`${this.adminUrl}/events/today/count`, { headers }).pipe(
      catchError(error => {
        console.error('Error fetching today\'s events count', error);
        return throwError(() => error);
      })
    );
  }

  getUnreadNotificationsCount(): Observable<number> {
    const headers = this.getAuthHeaders();
    return this.http.get<number>(`${this.adminUrl}/notifications/unread/count`, { headers }).pipe(
      catchError(error => {
        console.error('Error fetching unread notifications count', error);
        return throwError(() => error);
      })
    );
  }

  getAdminProfile(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.adminUrl}/profile`, { headers }).pipe(
      catchError(error => {
        console.error('Error fetching admin profile', error);
        return throwError(() => error);
      })
    );
  }
}
