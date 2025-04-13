import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  private apiUrl = 'http://localhost:8083/api/customers';
  private baseUrl = 'http://localhost:8083/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getCurrentCustomerDetails(): Observable<any> {
    const userDetails = this.authService.getUserDetails();
    if (userDetails && userDetails.id) {
      return this.getCustomerById(userDetails.id);
    }
    throw new Error('User not logged in or user ID not available');
  }

  getCustomerById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  updateCustomer(customer: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${customer.customerId}`, customer, { headers: this.getHeaders() });
  }

  changePassword(passwordData: any): Observable<any> {
    console.log('Sending password change request to new endpoint');
    // Using the new endpoint
    return this.http.post(`${this.baseUrl}/password/change`, passwordData, { headers: this.getHeaders() });
  }
}
