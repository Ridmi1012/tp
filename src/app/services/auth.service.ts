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
   private forgotPasswordUrl = `${this.apiUrl}/password/forgot`; // NEW URL
  private resetPasswordUrl = `${this.apiUrl}/password/reset`; // NEW URL
  private validateTokenUrl = `${this.apiUrl}/password/validate-token`; // NEW URL
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
        
        // Save complete user details including email and contact
        this.saveUserDetails({
          firstName: response.firstName,
          lastName: response.lastName,
          email: response.email,  // Make sure this is included
          contact: response.contact,  // Make sure this is included
          customerId: response.userId,
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

  getCustomerDetails(customerId?: number): Observable<any> {
  // If no customerId provided, get it from stored details
  const id = customerId || this.getCustomerId();
  
  if (!id) {
    return throwError(() => new Error('No customer ID available'));
  }
  
  const headers = this.getAuthHeaders();
  return this.http.get<any>(`${this.apiUrl}/customers/${id}`, { headers }).pipe(
    tap(response => {
      // Merge the fetched data with existing stored data
      const currentDetails = this.getUserDetails() || {};
      const updatedDetails = {
        ...currentDetails,
        ...response,
        customerId: id
      };
      
      // Update localStorage with complete details
      this.saveUserDetails(updatedDetails);
    }),
    catchError(error => {
      console.error('Error fetching customer details:', error);
      return throwError(() => error);
    })
  );
}

  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  getToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  debugToken(): void {
    const token = this.getToken();
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload);
      // Check specifically for the userType or roles claim
      console.log('User type:', payload.userType);
    } else {
      console.log('No token found');
    }
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

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // JWT exp claim is in seconds since epoch
      const expirationDate = new Date(payload.exp * 1000);
      return expirationDate <= new Date();
    } catch (e) {
      console.error('Error checking token expiration:', e);
      return true; // Consider expired on error
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  saveUserType(userType: string): void {
    localStorage.setItem('userType', userType);
  }

  getUserType(): string {
    return localStorage.getItem('userType') || '';
  }

  isAdmin(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Decode token (split by dots, take the middle part, decode from base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Check if userType is 'ADMIN' (case-sensitive as per your JWT filter)
      return payload.userType === 'ADMIN';
    } catch (e) {
      console.error('Error parsing token:', e);
      return false;
    }
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

  logTokenDetails(): void {
    const token = this.getToken();
    if (!token) {
      console.log('No token found');
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Full token payload:', payload);
      console.log('Token expiration:', new Date(payload.exp * 1000));
      console.log('User type:', payload.userType);
      console.log('Roles or authorities:', payload.roles || payload.authorities || 'None found');
    } catch (e) {
      console.error('Error parsing token:', e);
    }
  }


  hasRole(roleName: string): boolean {
    const token = this.getToken();
    if (!token) {
      console.error('No token found when checking for role:', roleName);
      return false;
    }
    
    try {
      // Decode token
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload when checking role:', payload);
      
      // Check userType directly (your most common case)
      if (payload.userType === roleName) {
        return true;
      }
      
      // Check roles array if it exists
      if (Array.isArray(payload.roles) && payload.roles.includes(roleName)) {
        return true;
      }
      
      // Check authorities if they exist (common in Spring Security)
      if (Array.isArray(payload.authorities)) {
        return payload.authorities.some((auth: string) => auth === roleName || auth === `ROLE_${roleName}`);
      }
      
      return false;
    } catch (e) {
      console.error('Error parsing token or checking roles:', e);
      return false;
    }
  }

  getPendingOrdersCount(): Observable<number> {
    // Replace with your actual API endpoint
    return this.http.get<number>(`${this.apiUrl}/orders/count/pending`);
  }
  
  getConfirmedOrdersCount(): Observable<number> {
    // Replace with your actual API endpoint
    return this.http.get<number>(`${this.apiUrl}/orders/count/confirmed`);
  }
  
  getPendingPaymentsCount(): Observable<number> {
    // Replace with your actual API endpoint
    return this.http.get<number>(`${this.apiUrl}/payments/count/pending`);
  }

  requestPasswordReset(username: string): Observable<any> {
    const payload = { username };
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.post(this.forgotPasswordUrl, payload, { headers }).pipe(
      tap(response => console.log('Password reset requested', response)),
      catchError(error => {
        console.error('Password reset request failed', error);
        return throwError(() => error);
      })
    );
  }

   /**
   * NEW METHOD - Reset password with token
   * Resets the password using the provided reset token
   */
  resetPassword(token: string, newPassword: string): Observable<any> {
    const payload = { token, newPassword };
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.post(this.resetPasswordUrl, payload, { headers }).pipe(
      tap(response => console.log('Password reset successful', response)),
      catchError(error => {
        console.error('Password reset failed', error);
        return throwError(() => error);
      })
    );
  }
  
  /**
   * NEW METHOD - Validate reset token
   * Checks if a reset token is still valid
   */
  validateResetToken(token: string): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.get(`${this.validateTokenUrl}?token=${token}`, { headers }).pipe(
      tap(response => console.log('Token validation response', response)),
      catchError(error => {
        console.error('Token validation failed', error);
        return throwError(() => error);
      })
    );
  }
}
