import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Customer {
  customerId: number;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;  // Add this line
  contact: string;
  address?: string;
}

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

  getCurrentCustomerDetails(): Observable<Customer> {
    const userDetails = this.authService.getUserDetails();
    if (!userDetails || !userDetails.customerId) {
      throw new Error('No customer ID found in user details');
    }
    return this.getCustomerById(userDetails.customerId.toString());
  }

  // Get customer details by ID
  getCustomerById(customerId: string): Observable<Customer> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<Customer>(`${this.apiUrl}/${customerId}`, { headers });
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
