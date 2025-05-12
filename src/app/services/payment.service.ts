import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { CloudinaryserviceService } from './cloudinaryservice.service';
import { switchMap } from 'rxjs/operators';
import { catchError, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';


export interface InstallmentPlan {
  id: number;
  name: string;
  numberOfInstallments: number;
  percentages: number[];
  description: string;
}

export interface Payment {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName: string;
  eventDate: string;
  amount: number;
  paymentType: string; // 'full' or 'partial'
  method: string; // 'payhere' or 'bank-transfer'
  slipUrl: string;
  slipThumbnail: string;
  notes?: string;
  paymentDateTime?: string; // When payment was made/initiated
  submittedDate?: string; // Added ? to make optional
  status: string; // 'pending', 'completed', 'rejected'
  verifiedDate?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  installmentNumber?: number; // Which installment this payment represents (1st, 2nd, etc.)
  remainingAmount?: number; // Amount remaining after this payment
  isActive?: boolean; // Added for PaymentHistoryComponent
}

export interface PaymentSummary {
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  paymentStatus: string;
  installmentPlan?: InstallmentPlan; // Changed to proper type
  currentInstallment?: number;
  nextInstallmentAmount?: number;
  nextInstallmentDueDate?: string;
  deadlineDate?: string;
  payments: Payment[];
  activePaymentId?: number; // Added for PaymentHistoryComponent
}

export interface PaymentResponse {
  data: Payment[];
  total: number;
  page: number;
  pageSize: number;
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

 getAvailableInstallmentPlans(eventDate: string, totalPrice: number): Observable<InstallmentPlan[]> {
    const headers = this.getHeaders();
    return this.http.get<InstallmentPlan[]>(`${this.apiUrl}/installment-plans?eventDate=${eventDate}&totalPrice=${totalPrice}`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching installment plans:', error);
          return throwError(() => new Error('Failed to fetch installment plans: ' + this.getErrorMessage(error)));
        })
      );
  }

  getAvailableInstallmentPlansForOrder(orderId: string): Observable<InstallmentPlan[]> {
    const headers = this.getHeaders();
    return this.http.get<InstallmentPlan[]>(`${this.apiUrl}/${orderId}/installment-plans`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching installment plans for order:', error);
          return throwError(() => new Error('Failed to fetch installment plans: ' + this.getErrorMessage(error)));
        })
      );
  }

 calculateInstallmentAmount(totalPrice: number, planId: number, installmentNumber: number): number {
    // Find the plan in our local cache if available
    const plan = this.getLocalInstallmentPlan(planId);
    if (!plan || installmentNumber < 1 || installmentNumber > plan.numberOfInstallments) {
      return 0;
    }
    
    return (plan.percentages[installmentNumber - 1] / 100) * totalPrice;
  }
  
  // Helper method to get a locally cached installment plan
  private getLocalInstallmentPlan(planId: number): InstallmentPlan | null {
    // Check localStorage for cached plans
    const cachedPlansJson = localStorage.getItem('installmentPlans');
    if (cachedPlansJson) {
      try {
        const cachedPlans: InstallmentPlan[] = JSON.parse(cachedPlansJson);
        return cachedPlans.find(p => p.id === planId) || null;
      } catch (e) {
        console.error('Error parsing cached installment plans:', e);
      }
    }
    return null;
  }
  
 
   initiatePayment(
    orderId: string, 
    amount: number, 
    paymentMethod: 'payhere' | 'bank-transfer',
    installmentPlanId?: number,
    installmentNumber?: number,
    notes?: string
  ): Observable<any> {
    const headers = this.getHeaders();
    const paymentData = {
      orderId: orderId,
      amount: amount,
      paymentMethod: paymentMethod,
      installmentPlanId: installmentPlanId,
      installmentNumber: installmentNumber,
      notes: notes
    };
    
    // Check if user is authorized to make payments
    if (!this.authService.isCustomer()) {
      return throwError(() => new Error('You do not have permission to make payments. Please login as a customer.'));
    }
    
    if (paymentMethod === 'payhere') {
      return this.http.post(`${this.apiUrl}/payhere/initiate`, paymentData, { headers })
        .pipe(
          tap(response => {
            console.log('PayHere payment initiated:', response);
            
            // Create and submit form to PayHere
            this.submitPayHereForm(response);
          }),
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

   // Method to handle submission to PayHere
  private submitPayHereForm(payHereData: any): void {
    // Log all parameters for debugging
    console.log('PayHere form data:', payHereData);
    
    // Create form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payHereData.checkout_url || 'https://sandbox.payhere.lk/pay/checkout';
    form.style.display = 'none';
    
    // Add all fields as hidden input elements
    Object.keys(payHereData).forEach(key => {
      // Skip checkout_url as it's not a form parameter
      if (key !== 'checkout_url') {
        const hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.name = key;
        hiddenField.value = payHereData[key];
        form.appendChild(hiddenField);
      }
    });
    
    // Add form to body and submit
    document.body.appendChild(form);
    
    // Log before submission
    console.log('Submitting PayHere form to:', form.action);
    console.log('Form HTML:', form.outerHTML);
    
    try {
      form.submit();
    } catch (error) {
      console.error('Error submitting PayHere form:', error);
    }
  }

  // Verify payment after returning from PayHere
  verifyPayHerePayment(orderId: string, paymentId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/payhere/verify`, 
      { 
        orderId: orderId, 
        paymentId: paymentId 
      }, 
      { headers })
      .pipe(
        tap(response => console.log('Payment verification successful:', response)),
        catchError(error => {
          console.error('PayHere verification error:', error);
          return throwError(() => new Error('Failed to verify PayHere payment: ' + this.getErrorMessage(error)));
        })
      );
  }

  uploadPaymentSlip(
    orderId: string, 
    file: File, 
    amount: number, 
    isPartialPayment: boolean = false,
    installmentPlanId?: number,
    installmentNumber?: number,
    notes?: string
  ): Observable<any> {
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
          amount: amount,
          isPartialPayment: isPartialPayment,
          installmentPlanId: installmentPlanId,
          installmentNumber: installmentNumber,
          notes: notes
        };
        
        // Use the payment-slip-upload endpoint
        return this.http.post(`${this.apiUrl}/${orderId}/payment-slip-upload`, paymentSlipData, { headers });
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

    // Get payment summary for an order
  getPaymentSummary(orderId: string): Observable<PaymentSummary> {
    const headers = this.getHeaders();
    return this.http.get<PaymentSummary>(`${this.apiUrl}/${orderId}/payment-summary`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching payment summary:', error);
          return throwError(() => new Error('Failed to fetch payment summary: ' + this.getErrorMessage(error)));
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

  getPendingPaymentsCount(): Observable<number> {
    const headers = this.getHeaders();
    return this.http.get<number>(`${this.apiUrl}/payments/pending/count`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching pending payment count:', error);
          return throwError(() => new Error('Failed to fetch pending payment count: ' + this.getErrorMessage(error)));
        })
      );
  }

   // Get all payments with pagination and filtering
  getAllPayments(
    orderId?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 10,
    searchTerm?: string,
    sortField?: string,
    sortDirection?: string
  ): Observable<PaymentResponse> {
    const headers = this.getHeaders();
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (orderId) params = params.set('orderId', orderId);
    if (status) params = params.set('status', status);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    if (sortField) params = params.set('sortField', sortField);
    if (sortDirection) params = params.set('sortDirection', sortDirection);

    return this.http.get<PaymentResponse>(`${this.apiUrl}/payments`, { headers, params })
      .pipe(
        catchError(error => {
          console.error('Error fetching all payments:', error);
          return throwError(() => new Error('Failed to fetch payments: ' + this.getErrorMessage(error)));
        })
      );
  }

 

  

 
}
