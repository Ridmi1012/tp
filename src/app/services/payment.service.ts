import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { CloudinaryserviceService } from './cloudinaryservice.service';
import { switchMap } from 'rxjs/operators';
import { catchError, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { tap } from 'rxjs/operators';


export interface Payment {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName: string;
  eventDate: string;
  amount: number;
  paymentType: string; // 'full' or 'partial'
  slipUrl: string;
  slipThumbnail: string;
  notes?: string;
  submittedDate: string;
  status: string; // 'pending', 'verified', 'rejected'
  verifiedDate?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = 'http://localhost:8083/api/orders';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cloudinaryService: CloudinaryserviceService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      console.error('Authentication token is missing');
      throw new Error('Session expired. Please log in again.');
    }
    
    return new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`);
  }

  initiatePayment(orderId: string, amount: number, paymentMethod: 'payhere' | 'bank-transfer' | 'online-transfer'): Observable<any> {
    const headers = this.getHeaders();
    const paymentData = {
      orderId: orderId,
      amount: amount,
      paymentMethod: paymentMethod
    };
    
    // Check if user is authorized to make payments
    if (!this.authService.isCustomer()) {
      return throwError(() => new Error('You do not have permission to make payments. Please login as a customer.'));
    }
    
    if (paymentMethod === 'payhere') {
      return this.http.post(`${this.apiUrl}/payhere/initiate`, paymentData, { headers })
        .pipe(
          catchError(error => {
            console.error('Payment initiation error:', error);
            return throwError(() => new Error('Failed to initiate payment: ' + this.getErrorMessage(error)));
          })
        );
    } else {
      return this.http.post(`${this.apiUrl}/payment`, paymentData, { headers })
        .pipe(
          catchError(error => {
            console.error('Payment processing error:', error);
            return throwError(() => new Error('Failed to process payment: ' + this.getErrorMessage(error)));
          })
        );
    }
  }

  uploadPaymentSlip(orderId: string, file: File, amount?: number, notes?: string): Observable<any> {
    // Validate inputs
    if (!orderId) {
      return throwError(() => new Error('Order ID is required'));
    }
    
    if (!file) {
      return throwError(() => new Error('No file selected'));
    }

    // Check if user is logged in and has the CUSTOMER role
    if (!this.authService.isLoggedIn()) {
      return throwError(() => new Error('Authentication required to upload payment slips'));
    }
    
    if (!this.authService.isCustomer()) {
      return throwError(() => new Error('You do not have permission to upload payment slips. Please login as a customer.'));
    }

    // Validate file type and size
    if (!this.isValidFileType(file)) {
      return throwError(() => new Error('Invalid file type. Please upload an image.'));
    }

    if (!this.isValidFileSize(file)) {
      return throwError(() => new Error('File size exceeds 5MB limit.'));
    }

    // Use the CloudinaryService to upload the file
    return this.cloudinaryService.uploadImage(file).pipe(
      tap(response => console.log('Cloudinary upload succeeded:', response.secure_url)),
      switchMap(cloudinaryResponse => {
        if (!cloudinaryResponse || !cloudinaryResponse.secure_url) {
          return throwError(() => new Error('Failed to upload image to Cloudinary.'));
        }

        // After successful upload to Cloudinary, send the image URL to your API
        const headers = this.getHeaders();
        const paymentSlipData = {
          imageUrl: cloudinaryResponse.secure_url,
          publicId: cloudinaryResponse.public_id,
          amount: amount,
          isPartialPayment: amount ? true : false,
          notes: notes
        };
        
        return this.http.post(`${this.apiUrl}/${orderId}/payment-slip`, paymentSlipData, { headers });
      }),
      catchError(error => {
        console.error('Payment slip upload error:', error);
        
        if (error.message && error.message.includes('Cloudinary')) {
          return throwError(() => new Error('Failed to upload to cloud storage. Please try again.'));
        }
        
        if (error.status === 403) {
          if (this.authService.isTokenExpired()) {
            this.authService.logout();
            return throwError(() => new Error('Your session has expired. Please log in again.'));
          }
          return throwError(() => new Error('Access denied: You may need to log in again or do not have the required permissions.'));
        }
        
        if (error.status === 401) {
          this.authService.logout();
          return throwError(() => new Error('Your session has expired. Please log in again.'));
        }
        
        return throwError(() => new Error('Failed to save payment slip: ' + this.getErrorMessage(error)));
      })
    );
  }

  // Get all pending payments that need verification (admin only)
  getPendingPayments(): Observable<Payment[]> {
    const headers = this.getHeaders();
    return this.http.get<Payment[]>(`${this.apiUrl}/pending/verification`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching pending payments:', error);
          return throwError(() => new Error('Failed to fetch pending payments: ' + this.getErrorMessage(error)));
        })
      );
  }

  // Get recently verified payments (last 7 days)
  getRecentlyVerifiedPayments(): Observable<Payment[]> {
    const headers = this.getHeaders();
    return this.http.get<Payment[]>(`${this.apiUrl}/verified/recent`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching verified payments:', error);
          return throwError(() => new Error('Failed to fetch verified payments: ' + this.getErrorMessage(error)));
        })
      );
  }

  // Verify a payment (admin only)
  verifyPayment(orderId: string, paymentId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/${orderId}/payment/${paymentId}/verify`, { approved: true }, { headers })
      .pipe(
        catchError(error => {
          console.error('Error verifying payment:', error);
          return throwError(() => new Error('Failed to verify payment: ' + this.getErrorMessage(error)));
        })
      );
  }

  // Reject a payment with reason (admin only)
  rejectPayment(orderId: string, paymentId: string, reason: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/${orderId}/payment/${paymentId}/verify`, 
      { approved: false, reason: reason }, 
      { headers })
      .pipe(
        catchError(error => {
          console.error('Error rejecting payment:', error);
          return throwError(() => new Error('Failed to reject payment: ' + this.getErrorMessage(error)));
        })
      );
  }

  // Get all payments with filtering options (admin only)
  getAllPayments(
    page: number = 1, 
    limit: number = 20, 
    status?: string, 
    startDate?: string, 
    endDate?: string
  ): Observable<{data: Payment[], total: number}> {
    const headers = this.getHeaders();
    let url = `${this.apiUrl}/payments?page=${page}&limit=${limit}`;
    
    if (status) url += `&status=${status}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    return this.http.get<{data: Payment[], total: number}>(url, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching payments:', error);
          return throwError(() => new Error('Failed to fetch payments: ' + this.getErrorMessage(error)));
        })
      );
  }

  // Get payments for a specific order
  getPaymentsByOrderId(orderId: string): Observable<Payment[]> {
    const headers = this.getHeaders();
    return this.http.get<Payment[]>(`${this.apiUrl}/${orderId}/payments`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching order payments:', error);
          return throwError(() => new Error('Failed to fetch order payments: ' + this.getErrorMessage(error)));
        })
      );
  }

  private isValidFileType(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    return allowedTypes.includes(file.type);
  }

  private isValidFileSize(file: File): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    return file.size <= maxSize;
  }

  private getErrorMessage(error: any): string {
    if (error.error && error.error.message) {
      return error.error.message;
    } else if (error.message) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else {
      return 'Unknown error occurred';
    }
  }
}
