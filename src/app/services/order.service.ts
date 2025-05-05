import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of  } from 'rxjs';
import { DesignService } from './design.service';
import { HttpHeaders } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface OrderData {
  designId: string;
  orderType: 'as-is' | 'custom-design' | 'custom-request';
  customDetails: {
    customName: string;
    customAge: string;
    venue: string;
    eventDate: string;
    eventTime: string;
    eventCategory: string;
  };
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    contact: string;
    relationshipToPerson: string;
  };
  status: string;
  customerId: string;
}

export interface Order extends OrderData {
  _id: string;
  orderNumber: string;
  totalPrice?: number;
  paymentStatus: 'pending' | 'partial' | 'completed';
  basePrice: number;
  transportationCost?: number;
  additionalRentalCost?: number;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentData {
  orderId: string;
  amount: number;
  paymentMethod: 'payhere' | 'bank-transfer' | 'online-transfer';
  paymentSlip?: string; // For bank/online transfers
  transactionId?: string; // For PayHere
}


@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `http://localhost:8083/api/orders`;

  constructor(
    private http: HttpClient,
    private designService: DesignService,
    private authService: AuthService
  ) {}

  // Helper to create headers with auth token
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`);
  }

  // Create a new order
  createOrder(orderData: OrderData): Observable<Order> {
    // Debug: Check authentication status and token
    const token = this.authService.getToken();
    const userDetails = this.authService.getUserDetails();
    const userType = this.authService.getUserType();
    
    console.log('Debug: Creating order with:');
    console.log('- Token:', token ? 'Present' : 'Missing');
    console.log('- User Type:', userType);
    console.log('- User Details:', userDetails);
    console.log('- Order Data:', orderData);
    
    // Ensure we have the correct headers
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`);
    
    console.log('Debug: Headers being sent:', headers.keys());
    console.log('Debug: Authorization header:', headers.get('Authorization'));
    
    return this.http.post<Order>(this.apiUrl, orderData, { headers }).pipe(
      tap(response => {
        console.log('Order created successfully:', response);
      }),
      catchError(error => {
        console.error('Error creating order:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error
        });
        throw error;
      })
    );
  }

  // Get all orders for a customer
  getCustomerOrders(customerId: string): Observable<Order[]> {
    // Get token for authorization header
    const token = this.authService.getToken();
    
    // Log debugging info
    console.log('Getting orders for customer:', customerId);
    console.log('Token present:', !!token);
    
    // Create headers with token
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`);
    
    // Make sure to use the correct endpoint that's permitted in your security config
    return this.http.get<Order[]>(`${this.apiUrl}/customer/${customerId}`, { headers }).pipe(
      tap(orders => console.log(`Retrieved ${orders.length} orders for customer ${customerId}`)),
      catchError(error => {
        console.error('Error fetching customer orders:', error);
        return throwError(() => error);
      })
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      // Let the app keep running by returning an empty result
      return of(result as T);
    };
  }
  // Get all orders (admin)
  getAllOrders(): Observable<Order[]> {
    const headers = this.getAuthHeaders();
    // Remove the duplicate "/orders" path segment
    return this.http.get<Order[]>(`${this.apiUrl}`, { headers })
      .pipe(
        catchError(this.handleError('getAllOrders', []))
      );
  }

  // Get order by ID
  getOrderById(orderId: string): Observable<Order> {
    const headers = this.getAuthHeaders();
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`, { headers }).pipe(
      catchError(error => {
        console.error('Error fetching order details:', error);
        return throwError(() => new Error('Failed to fetch order details: ' + this.getErrorMessage(error)));
      })
    );
  }
  

  // Update order (admin - confirm/cancel)
  updateOrder(orderId: string, updateData: Partial<Order>): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${orderId}`, updateData);
  }

  getCustomerOngoingOrders(customerId: string): Observable<Order[]> {
    // Get token for authorization header
    const token = this.authService.getToken();
    
    // Create headers with token
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`);
    
    // Use the ongoing endpoint with customer ID
    return this.http.get<Order[]>(`${this.apiUrl}/customer/${customerId}/ongoing`, { headers }).pipe(
      tap(orders => console.log(`Retrieved ${orders.length} ongoing orders for customer ${customerId}`)),
      catchError(error => {
        console.error('Error fetching ongoing orders:', error);
        return throwError(() => error);
      })
    );
  }

  // Confirm order (admin)
  confirmOrder(orderId: string, additionalCosts: {
    transportationCost: number;
    additionalRentalCost: number;
  }): Observable<Order> {
    const headers = this.getHeaders();
    return this.http.post<Order>(`${this.apiUrl}/${orderId}/confirm`, additionalCosts, { headers }).pipe(
      catchError(error => {
        console.error('Error confirming order:', error);
        return throwError(() => new Error('Failed to confirm order: ' + this.getErrorMessage(error)));
      })
    );
  }

  cancelOrder(orderId: string, reason: string): Observable<Order> {
    const headers = this.getHeaders();
    return this.http.post<Order>(`${this.apiUrl}/${orderId}/cancel`, { reason }, { headers }).pipe(
      catchError(error => {
        console.error('Error cancelling order:', error);
        return throwError(() => new Error('Failed to cancel order: ' + this.getErrorMessage(error)));
      })
    );
  }

  // Get new orders (pending - for admin)
  getNewOrders(): Observable<Order[]> {
    const headers = this.getHeaders();
    return this.http.get<Order[]>(`${this.apiUrl}/new`, { headers }).pipe(
      catchError(error => {
        console.error('Error getting new orders:', error);
        return throwError(() => new Error('Failed to fetch new orders: ' + this.getErrorMessage(error)));
      })
    );
  }

  // Update event details (customer - venue change)
  updateEventDetails(orderId: string, eventDetails: {
    venue?: string;
    eventDate?: string;
    eventTime?: string;
  }): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${orderId}/event-details`, eventDetails);
  }

  // Process payment
  processPayment(paymentData: PaymentData): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment`, paymentData);
  }

  // Upload payment slip
  uploadPaymentSlip(orderId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('paymentSlip', file);
    return this.http.post(`${this.apiUrl}/${orderId}/payment-slip`, formData);
  }

// Get design by ID
getDesignById(designId: string | number): Observable<any> {
  const headers = this.getHeaders();
  return this.http.get<any>(`http://localhost:8083/api/designs/${designId}`, { headers }).pipe(
    catchError(error => {
      console.error('Error getting design details:', error);
      return throwError(() => new Error('Failed to fetch design details: ' + this.getErrorMessage(error)));
    })
  );
}

  // Get ongoing orders (confirmed but not completed)
  getOngoingOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/ongoing`);
  }

   // Helper to get readable error message
   private getErrorMessage(error: any): string {
    if (error.status === 403) {
      return 'You do not have permission to access this resource. Please log in again.';
    }
    return error.error?.message || error.statusText || 'Unknown error';
  }

  // PayHere integration methods
  initiatePayHerePayment(orderId: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/payhere/initiate`, { orderId, amount });
  }

  verifyPayHerePayment(orderId: string, paymentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payhere/verify`, { orderId, paymentId });
  }
}
