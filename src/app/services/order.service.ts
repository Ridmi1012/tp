import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of  } from 'rxjs';
import { DesignService } from './design.service';
import { HttpHeaders } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface OrderItemRequest {
  itemId: number;
  itemName: string;
  itemCategory: string;
  quantity: number;
  pricePerUnit: number;
  status: 'active' | 'dropped';
}

// Interface for Payment
export interface Payment {
  _id?: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  paymentMethod: string;
  transactionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Interface for creating a new order
export interface CreateOrderData {
  designId: string;
  orderType: string; // 'as-is' or 'request-similar'
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
  
  // NEW - Fields for request-similar
  themeColor?: string;
  conceptCustomization?: string;
  orderItems?: OrderItemRequest[];
}


// Base interface for order data structure
export interface OrderData {
  id: string;
  orderNumber: string;
  designId: string;
  orderType: string;
  status: string;
  customerId: string;
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
  basePrice: number;
  transportationCost?: number;
  additionalRentalCost?: number;
  totalPrice?: number;
  paymentStatus: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  payments?: Payment[];
  
  // NEW - Fields for request-similar
  themeColor?: string;
  conceptCustomization?: string;
  orderItems?: OrderItemRequest[];
}

export interface Order extends OrderData {
  installmentPlanId: any;
  installmentTotalInstallments: any;
  id: string;
  orderNumber: string;
  totalPrice?: number;
  paymentStatus: 'pending' | 'partial' | 'completed';
  basePrice: number;
  transportationCost?: number;
  additionalRentalCost?: number;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  payments?: Payment[];
}

export interface PaymentData {
  orderId: string;
  amount: number;
  paymentMethod: 'payhere' | 'bank-transfer' | 'online-transfer';
  paymentSlip?: string; // For bank/online transfers
  transactionId?: string; // For PayHere
  notes?: string; // For additional notes
}

export interface OrderPricingUpdate {
  transportationCost: number;
  additionalRentalCost: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
    private apiUrl = `http://localhost:8083/api/orders`;
  
    constructor(
      private http: HttpClient,
      private authService: AuthService
    ) {}
  
    // Helper to create headers with auth token
    private getHeaders(): HttpHeaders {
      const token = this.authService.getToken();
      return new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${token}`);
    }
  
    // Create a new order - updated to use CreateOrderData interface
    createOrder(orderData: CreateOrderData): Observable<Order> {
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
          return throwError(() => error);
        })
      );
    }

    updateOrderItems(orderId: string, items: OrderItemRequest[]): Observable<Order> {
  const headers = this.getHeaders();
  
  return this.http.put<Order>(`${this.apiUrl}/${orderId}/items`, items, { headers }).pipe(
    tap(order => console.log('Order items updated successfully:', order)),
    catchError(error => {
      console.error('Error updating order items:', error);
      return throwError(() => new Error('Failed to update order items: ' + this.getErrorMessage(error)));
    })
  );
}

// NEW - Method to update customization
updateCustomization(orderId: string, customization: { themeColor?: string; conceptCustomization?: string }): Observable<Order> {
  const headers = this.getHeaders();
  
  return this.http.patch<Order>(`${this.apiUrl}/${orderId}/customization`, customization, { headers }).pipe(
    tap(order => console.log('Customization updated successfully:', order)),
    catchError(error => {
      console.error('Error updating customization:', error);
      return throwError(() => new Error('Failed to update customization: ' + this.getErrorMessage(error)));
    })
  );
}
  
    // Get all orders for a customer
    getCustomerOrders(customerId: string): Observable<Order[]> {
      // Get token for authorization header
      const token = this.authService.getToken();
      
      // Log debugging info
      console.log('Getting orders for customer ID:', customerId);
      console.log('Token present:', !!token);
      
      // Create headers with token
      const headers = new HttpHeaders()
        .set('Authorization', `Bearer ${token}`);
      
      // Use customerId instead of username
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
          catchError(this.handleError<Order[]>('getAllOrders', []))
        );
    }
  
    // Get order by ID
    getOrderById(orderId: string): Observable<Order> {
      const headers = this.getHeaders();
      
      return this.http.get<Order>(`${this.apiUrl}/${orderId}`, { headers }).pipe(
        catchError(error => {
          console.error('Error fetching order details:', error);
          return throwError(() => new Error('Failed to fetch order details: ' + this.getErrorMessage(error)));
        })
      );
    }
      
    // Update order
    updateOrder(orderId: string, updateData: Partial<Order>): Observable<Order> {
      const headers = this.getHeaders();
      // Change from PATCH to POST
      return this.http.post<Order>(`${this.apiUrl}/${orderId}/update`, updateData, { headers }).pipe(
        catchError(error => {
          console.error('Error updating order:', error);
          return throwError(() => new Error('Failed to update order: ' + this.getErrorMessage(error)));
        })
      );
    }
  
    // Update order status
    updateOrderStatus(orderId: string, status: string): Observable<Order> {
      const headers = this.getHeaders();
      return this.http.post<Order>(`${this.apiUrl}/${orderId}/update`, { status }, { headers }).pipe(
        tap(order => console.log(`Order status updated to ${status} successfully:`, order)),
        catchError(error => {
          console.error('Error updating order status:', error);
          return throwError(() => new Error('Failed to update order status: ' + this.getErrorMessage(error)));
        })
      );
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
      
      console.log('Confirming order with ID:', orderId);
      console.log('Additional costs:', additionalCosts);
      
      return this.http.post<Order>(`${this.apiUrl}/${orderId}/confirm`, additionalCosts, { headers }).pipe(
        tap(order => console.log('Order confirmed successfully:', order)),
        catchError(error => {
          console.error('Error confirming order:', error);
          return throwError(() => new Error('Failed to confirm order: ' + this.getErrorMessage(error)));
        })
      );
    }
  
    // Cancel order
    cancelOrder(orderId: string, reason: string): Observable<Order> {
      const headers = this.getHeaders();
      
      return this.http.post<Order>(`${this.apiUrl}/${orderId}/cancel`, { reason }, { headers }).pipe(
        tap(order => console.log('Order cancelled successfully:', order)),
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
      const headers = this.getHeaders();
      
      return this.http.patch<Order>(`${this.apiUrl}/${orderId}/event-details`, eventDetails, { headers }).pipe(
        catchError(error => {
          console.error('Error updating event details:', error);
          return throwError(() => error);
        })
      );
    }
  
    // Process payment
    processPayment(paymentData: PaymentData): Observable<any> {
      const headers = this.getHeaders();
      
      return this.http.post(`${this.apiUrl}/payment`, paymentData, { headers }).pipe(
        catchError(error => {
          console.error('Error processing payment:', error);
          return throwError(() => error);
        })
      );
    }
  
    // Upload payment slip
    uploadPaymentSlip(orderId: string, file: File, partialAmount?: number, notes?: string): Observable<any> {
      const token = this.authService.getToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      const formData = new FormData();
      formData.append('paymentSlip', file);
      
      if (partialAmount !== undefined) {
        formData.append('amount', partialAmount.toString());
      }
      
      if (notes) {
        formData.append('notes', notes);
      }
      
      return this.http.post(`${this.apiUrl}/${orderId}/payment-slip`, formData, { headers }).pipe(
        catchError(error => {
          console.error('Error uploading payment slip:', error);
          return throwError(() => error);
        })
      );
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
      const headers = this.getHeaders();
      
      return this.http.get<Order[]>(`${this.apiUrl}/ongoing`, { headers }).pipe(
        catchError(error => {
          console.error('Error getting ongoing orders:', error);
          return throwError(() => error);
        })
      );
    }
  
    // Helper to get readable error message
    private getErrorMessage(error: any): string {
      if (error.status === 403) {
        return 'You do not have permission to access this resource. Please log in again.';
      }
      return error.error?.message || error.statusText || 'Unknown error';
    }
  
    // PayHere integration methods
    initiatePayment(orderId: string, amount: number, paymentMethod: 'payhere' | 'bank-transfer'): Observable<any> {
      const headers = this.getHeaders();
      
      return this.http.post(`${this.apiUrl}/${orderId}/payment/initiate`, { amount, paymentMethod }, { headers }).pipe(
        catchError(error => {
          console.error(`Error initiating ${paymentMethod} payment:`, error);
          return throwError(() => error);
        })
      );
    }
  
    verifyPayHerePayment(orderId: string, paymentId: string): Observable<any> {
      const headers = this.getHeaders();
      
      return this.http.post(`${this.apiUrl}/payhere/verify`, { orderId, paymentId }, { headers }).pipe(
        catchError(error => {
          console.error('Error verifying PayHere payment:', error);
          return throwError(() => error);
        })
      );
    }
    
    // Method to handle payment verification 
    verifyManualPayment(orderId: string, paymentId: string, isApproved: boolean): Observable<Order> {
      const headers = this.getHeaders();
      
      return this.http.post<Order>(`${this.apiUrl}/${orderId}/payment/${paymentId}/verify`, 
        { approved: isApproved }, 
        { headers }
      ).pipe(
        tap(order => console.log(`Payment ${isApproved ? 'approved' : 'rejected'} successfully:`, order)),
        catchError(error => {
          console.error('Error verifying payment:', error);
          return throwError(() => new Error('Failed to verify payment: ' + this.getErrorMessage(error)));
        })
      );
    }
  
    // Get payment details for an order
    getOrderPayments(orderId: string): Observable<Payment[]> {
      const headers = this.getHeaders();
      
      return this.http.get<Payment[]>(`${this.apiUrl}/${orderId}/payments`, { headers }).pipe(
        catchError(error => {
          console.error('Error getting order payments:', error);
          return throwError(() => new Error('Failed to fetch payment details: ' + this.getErrorMessage(error)));
        })
      );
    }
  
    // Create an event from a completed order
    createEventFromOrder(orderId: string): Observable<any> {
      const headers = this.getHeaders();
      
      return this.http.post<any>(`http://localhost:8083/api/events/from-order/${orderId}`, {}, { headers }).pipe(
        tap(event => console.log('Event created successfully:', event)),
        catchError(error => {
          console.error('Error creating event from order:', error);
          return throwError(() => new Error('Failed to create event: ' + this.getErrorMessage(error)));
        })
      );
    }
  
    // Get pending orders (for admin)
    getPendingOrders(): Observable<Order[]> {
      return this.http.get<Order[]>(`${this.apiUrl}/status/pending`);
    }
  
    // Get confirmed orders (for admin)
    getConfirmedOrders(): Observable<Order[]> {
      return this.http.get<Order[]>(`${this.apiUrl}/status/confirmed`);
    }
  
    // Get pending orders count
    getPendingOrdersCount(): Observable<number> {
      return this.http.get<number>(`${this.apiUrl}/count/pending`);
    }
  
    // Get confirmed orders count
    getConfirmedOrdersCount(): Observable<number> {
      return this.http.get<number>(`${this.apiUrl}/count/confirmed`);
    }

}
