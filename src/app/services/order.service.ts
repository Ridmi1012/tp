import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<Order[]>(`${this.apiUrl}/customer/${customerId}`);
  }

  // Get all orders (admin)
  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  // Get order by ID
  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`);
  }

  // Update order (admin - confirm/cancel)
  updateOrder(orderId: string, updateData: Partial<Order>): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${orderId}`, updateData);
  }

  // Confirm order (admin)
  confirmOrder(orderId: string, additionalCosts: {
    transportationCost: number;
    additionalRentalCost: number;
  }): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/${orderId}/confirm`, additionalCosts);
  }

  // Cancel order (admin or customer)
  cancelOrder(orderId: string, reason: string): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/${orderId}/cancel`, { reason });
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

  // Get design by ID (for order as is)
  getDesignById(designId: string): Observable<any> {
    // Convert string ID to number since design service expects number
    const id = parseInt(designId, 10);
    return this.designService.getDesignById(id);
  }

  // Get new orders (pending - for admin)
  getNewOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/new`);
  }

  // Get ongoing orders (confirmed but not completed)
  getOngoingOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/ongoing`);
  }

  // PayHere integration methods
  initiatePayHerePayment(orderId: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/payhere/initiate`, { orderId, amount });
  }

  verifyPayHerePayment(orderId: string, paymentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payhere/verify`, { orderId, paymentId });
  }
}
