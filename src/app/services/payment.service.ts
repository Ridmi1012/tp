import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { CloudinaryserviceService } from './cloudinaryservice.service';
import { switchMap } from 'rxjs/operators';
import { catchError, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';


// ENHANCED: Updated interface with comprehensive installment tracking
export interface InstallmentPlan {
  id: number;
  name: string;
  numberOfInstallments: number;
  percentages: number[];
  description: string;
  timeRequirement?: string; // Display time requirement in UI
  isActive?: boolean; // Track if plan is active
  
  // NEW: Order-specific tracking fields
  currentInstallmentNumber?: number; // Which installment is currently due
  completedInstallments?: number; // How many installments are completed
  totalPaidAmount?: number; // Total amount paid so far
  remainingAmount?: number; // Remaining amount to be paid
  overallStatus?: string; // "pending", "in-progress", "completed"
  
  // NEW: Individual installment breakdown
  breakdown?: InstallmentBreakdown[];
  installmentStatuses?: InstallmentStatus[];
  
  // NEW: Progress information
  progressPercentage?: number;
  isCompleted?: boolean;
}

// NEW: Interface for installment breakdown
export interface InstallmentBreakdown {
  installmentNumber: number;
  percentage: number;
  amount: number;
  description: string;
  status: string; // "pending", "paid", "overdue"
  isClickable: boolean; // Can customer pay this installment now?
  isCurrent: boolean; // Is this the current installment to pay?
}

// NEW: Interface for detailed installment status
export interface InstallmentStatus {
  installmentNumber: number;
  amount: number;
  percentage: number;
  status: string; // "pending", "confirmed", "rejected"
  paymentMethod?: string; // "payhere", "bank-transfer"
  transactionId?: string;
  submittedDate?: string;
  confirmedDate?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  isClickable: boolean; // Can be clicked to make payment
  isCurrent: boolean; // Current installment to pay
  isCompleted: boolean; // Is this installment completed
}

export interface Payment {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName?: string; // ADDED: Customer name for display
  eventDate?: string; // ADDED: Event date for display
  amount: number;
  paymentType: string; // 'full' or 'installment'
  method: string; // 'payhere' or 'bank-transfer'
  slipUrl?: string;
  slipThumbnail?: string;
  notes?: string;
  paymentDateTime?: string;
  submittedDate?: string;
  status: string; // 'pending', 'completed', 'rejected', 'partial'
  verifiedDate?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  installmentNumber?: number;
  remainingAmount?: number;
  isActive?: boolean;
}

// ENHANCED: Updated with comprehensive installment tracking
export interface PaymentSummary {
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  paymentStatus: string;
  installmentPlan?: InstallmentPlan;
  currentInstallment?: number;
  totalInstallments?: number;
  nextInstallmentAmount?: number;
  nextInstallmentDueDate?: string;
  deadlineDate?: string; // 24-hour deadline before event
  hoursUntilDeadline?: number; // NEW: Hours until deadline
  isDeadlinePassed?: boolean; // NEW: Has deadline passed
  payments: Payment[];
  activePaymentId?: number;
}

export interface PaymentResponse {
  data: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

// ENHANCED: Interface for installment options dropdown
export interface InstallmentOptions {
  hasInstallmentPlan: boolean;
  currentInstallment?: number;
  totalInstallments?: number;
  completedInstallments?: number;
  remainingInstallments?: number;
  progressPercentage?: number;
  totalPaid?: number;
  remainingAmount?: number;
  installments: InstallmentOption[];
}

export interface InstallmentOption {
  number: number;
  amount: number;
  percentage: number;
  status: string;
  isClickable: boolean;
  isCurrent: boolean;
  isCompleted: boolean;
  transactionId?: string;
  paymentMethod?: string;
  description: string;
}

// NEW: Interface for installment plan details
export interface InstallmentPlanDetails {
  hasInstallmentPlan: boolean;
  planDetails?: InstallmentPlan;
  orderTotal?: number;
  paymentId?: number;
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

  // EXISTING METHOD - This is not used anymore - backend provides plans based on order
  // NO CHANGES
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

  // EXISTING METHOD - Get available installment plans for order
  // ENHANCED with comprehensive installment tracking and caching
  getAvailableInstallmentPlansForOrder(orderId: string): Observable<InstallmentPlan[]> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${this.apiUrl}/${orderId}/installment-plans`, { headers })
      .pipe(
        tap(response => {
          console.log('Raw installment plans API response:', response);
        }),
        // Extract the array from the response if needed
        map(response => {
          let plans: InstallmentPlan[] = [];
          
          if (Array.isArray(response)) {
            plans = response;
          } else if (response && Array.isArray(response.data)) {
            plans = response.data;
          } else if (response && Array.isArray(response.plans)) {
            plans = response.plans;
          } else {
            console.error('Unexpected installment plans response format:', response);
            return [];
          }
          
          // ENHANCED: Process plans with order-specific information
          plans.forEach(plan => {
            this.setTimeRequirementForPlan(plan);
            this.calculateProgressInformation(plan);
          });
          
          // ENHANCED: Cache plans for offline use
          this.cachePlans(plans);
          
          console.log('Processed installment plans:', plans);
          return plans;
        }),
        catchError(error => {
          console.error('Error fetching installment plans for order:', error);
          return throwError(() => new Error('Failed to fetch installment plans: ' + this.getErrorMessage(error)));
        })
      );
  }

  // ENHANCED METHOD - Set time requirement for installment plans
  private setTimeRequirementForPlan(plan: InstallmentPlan): void {
    switch (plan.numberOfInstallments) {
      case 1:
        plan.timeRequirement = 'Available for all orders';
        break;
      case 2:
        plan.timeRequirement = 'Available for events 2+ weeks away';
        break;
      case 3:
        plan.timeRequirement = 'Available for events 3+ weeks away';
        break;
      case 4:
        plan.timeRequirement = 'Available for events 4+ weeks away';
        break;
      default:
        plan.timeRequirement = 'Custom plan';
    }
  }

  // NEW METHOD - Calculate progress information for installment plans
  private calculateProgressInformation(plan: InstallmentPlan): void {
    if (plan.completedInstallments !== undefined && plan.numberOfInstallments) {
      plan.progressPercentage = (plan.completedInstallments / plan.numberOfInstallments) * 100;
      plan.isCompleted = plan.completedInstallments === plan.numberOfInstallments;
    } else {
      plan.progressPercentage = 0;
      plan.isCompleted = false;
    }
  }

  // ENHANCED METHOD - Cache installment plans with expiration
  private cachePlans(plans: InstallmentPlan[]): void {
    try {
      const cacheData = {
        plans: plans,
        timestamp: Date.now(),
        expiresIn: 1000 * 60 * 30 // 30 minutes
      };
      localStorage.setItem('installmentPlans', JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Could not cache installment plans:', e);
    }
  }

  // NEW METHOD - Get installment options for dropdown display
  getInstallmentOptions(orderId: string): Observable<InstallmentOptions> {
    const headers = this.getHeaders();
    return this.http.get<InstallmentOptions>(`${this.apiUrl}/${orderId}/installment-options`, { headers })
      .pipe(
        tap(response => {
          console.log('Installment options response:', response);
        }),
        catchError(error => {
          console.error('Error fetching installment options:', error);
          // Return default structure if API fails
          return throwError(() => new Error('Failed to fetch installment options: ' + this.getErrorMessage(error)));
        })
      );
  }

  // NEW METHOD - Get detailed installment plan information for an order
  getInstallmentPlanDetails(orderId: string): Observable<InstallmentPlanDetails> {
    const headers = this.getHeaders();
    return this.http.get<InstallmentPlanDetails>(`${this.apiUrl}/${orderId}/installment-plan-details`, { headers })
      .pipe(
        tap(response => {
          console.log('Installment plan details response:', response);
        }),
        catchError(error => {
          console.error('Error fetching installment plan details:', error);
          return throwError(() => new Error('Failed to fetch installment plan details: ' + this.getErrorMessage(error)));
        })
      );
  }

  // EXISTING METHOD - Calculate installment amount
  // ENHANCED with better validation
  calculateInstallmentAmount(totalPrice: number, planId: number, installmentNumber: number): number {
    // Frontend calculation - backend does its own
    const plan = this.getLocalInstallmentPlan(planId);
    if (!plan || installmentNumber < 1 || installmentNumber > plan.numberOfInstallments) {
      console.warn('Invalid installment calculation parameters:', { planId, installmentNumber, planFound: !!plan });
      return 0;
    }
    
    const percentage = plan.percentages[installmentNumber - 1];
    const amount = (percentage / 100) * totalPrice;
    
    console.log(`Calculated installment ${installmentNumber} amount:`, {
      totalPrice,
      percentage,
      amount
    });
    
    return amount;
  }
  
  // ENHANCED METHOD - Get local installment plan with cache validation
  private getLocalInstallmentPlan(planId: number): InstallmentPlan | null {
    const cachedPlansJson = localStorage.getItem('installmentPlans');
    if (cachedPlansJson) {
      try {
        const cacheData = JSON.parse(cachedPlansJson);
        
        // Check if cache is expired
        if (Date.now() > cacheData.timestamp + cacheData.expiresIn) {
          localStorage.removeItem('installmentPlans');
          return null;
        }
        
        const cachedPlans: InstallmentPlan[] = cacheData.plans;
        return cachedPlans.find(p => p.id === planId) || null;
      } catch (e) {
        console.error('Error parsing cached installment plans:', e);
        localStorage.removeItem('installmentPlans');
      }
    }
    return null;
  }
  
  // EXISTING METHOD - Initiate payment
  // ENHANCED with better validation and installment support
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
    
    // ENHANCED: Validate installment parameters
    if (installmentPlanId && installmentPlanId > 1) {
      if (!installmentNumber || installmentNumber < 1) {
        return throwError(() => new Error('Invalid installment number for installment plan payment.'));
      }
      
      console.log('Initiating installment payment:', {
        orderId,
        installmentPlanId,
        installmentNumber,
        amount,
        paymentMethod
      });
    } else {
      console.log('Initiating full payment:', {
        orderId,
        amount,
        paymentMethod
      });
    }
    
    if (paymentMethod === 'payhere') {
      // PayHere initiation doesn't create DB records
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
      // Bank transfer creates payment record
      return this.http.post(`${this.apiUrl}/payment`, paymentData, { headers })
        .pipe(
          tap(response => {
            console.log('Bank transfer payment initiated:', response);
          }),
          catchError(error => {
            console.error('Payment processing error:', error);
            return throwError(() => new Error('Failed to process payment: ' + this.getErrorMessage(error)));
          })
        );
    }
  }

  // EXISTING METHOD - Submit PayHere form
  // NO CHANGES
  private submitPayHereForm(payHereData: any): void {
    console.log('PayHere form data:', payHereData);
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payHereData.checkout_url || 'https://sandbox.payhere.lk/pay/checkout';
    form.style.display = 'none';
    
    Object.keys(payHereData).forEach(key => {
      if (key !== 'checkout_url') {
        const hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.name = key;
        hiddenField.value = payHereData[key];
        form.appendChild(hiddenField);
      }
    });
    
    document.body.appendChild(form);
    
    console.log('Submitting PayHere form to:', form.action);
    
    try {
      form.submit();
    } catch (error) {
      console.error('Error submitting PayHere form:', error);
    }
  }

  // EXISTING METHOD - Verify PayHere payment
  // ENHANCED with better logging
  verifyPayHerePayment(orderId: string, paymentId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.apiUrl}/payhere/verify`, 
      { 
        orderId: orderId, 
        paymentId: paymentId 
      }, 
      { headers })
      .pipe(
        tap(response => {
          console.log('PayHere payment verification successful:', response);
        }),
        catchError(error => {
          console.error('PayHere verification error:', error);
          return throwError(() => new Error('Failed to verify PayHere payment: ' + this.getErrorMessage(error)));
        })
      );
  }

  // EXISTING METHOD - Upload payment slip
  // ENHANCED with better validation, installment support, and error handling
 // FIXED: Update the upload method in payment.service.ts
uploadPaymentSlip(
  orderId: string, 
  file: File, 
  amount: number, 
  isPartialPayment: boolean = false,
  installmentPlanId?: number,
  installmentNumber?: number,
  notes?: string
): Observable<any> {
  if (!orderId) {
    return throwError(() => new Error('Order ID is required'));
  }
  
  if (!file) {
    return throwError(() => new Error('No file selected'));
  }

  if (!this.authService.isLoggedIn()) {
    return throwError(() => new Error('Authentication required to upload payment slips'));
  }
  
  if (!this.authService.isCustomer()) {
    return throwError(() => new Error('You do not have permission to upload payment slips. Please login as a customer.'));
  }

  if (!this.isValidFileType(file)) {
    return throwError(() => new Error('Invalid file type. Please upload an image (JPG, PNG, GIF, WEBP).'));
  }

  if (!this.isValidFileSize(file)) {
    return throwError(() => new Error('File size exceeds 5MB limit.'));
  }

  // Validate installment parameters
  if (installmentPlanId && installmentPlanId > 1) {
    if (!installmentNumber || installmentNumber < 1) {
      return throwError(() => new Error('Invalid installment number for installment payment.'));
    }
    
    console.log('Uploading payment slip for installment payment:', {
      orderId,
      installmentPlanId,
      installmentNumber,
      amount,
      fileName: file.name,
      fileSize: file.size
    });
  } else {
    console.log('Uploading payment slip for full payment:', {
      orderId,
      amount,
      fileName: file.name,
      fileSize: file.size
    });
  }

  return this.cloudinaryService.uploadImage(file).pipe(
    tap(response => {
      console.log('Cloudinary upload succeeded:', response.secure_url);
    }),
    switchMap(cloudinaryResponse => {
      if (!cloudinaryResponse || !cloudinaryResponse.secure_url) {
        return throwError(() => new Error('Failed to upload image to cloud storage.'));
      }

      const headers = this.getHeaders();
      
      const paymentSlipData = {
        imageUrl: cloudinaryResponse.secure_url,
        amount: amount,
        isPartialPayment: isPartialPayment,
        installmentPlanId: installmentPlanId,
        installmentNumber: installmentNumber,
        notes: notes
      };
      
      // FIXED: Changed from '/payment-slip-upload' to '/payment-slip' to match Spring Security config
      return this.http.post(`${this.apiUrl}/${orderId}/payment-slip`, paymentSlipData, { headers });
    }),
    tap(response => {
      console.log('Payment slip upload completed successfully:', response);
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

  // EXISTING METHOD - Get payment summary
  // ENHANCED with better error handling and caching
  getPaymentSummary(orderId: string): Observable<PaymentSummary> {
    const headers = this.getHeaders();
    return this.http.get<PaymentSummary>(`${this.apiUrl}/${orderId}/payment-summary`, { headers })
      .pipe(
        tap(summary => {
          console.log('Payment summary retrieved:', {
            orderId,
            totalAmount: summary.totalAmount,
            totalPaid: summary.totalPaid,
            remainingAmount: summary.remainingAmount,
            isFullyPaid: summary.isFullyPaid,
            paymentStatus: summary.paymentStatus,
            hasInstallmentPlan: !!summary.installmentPlan,
            currentInstallment: summary.currentInstallment,
            totalInstallments: summary.totalInstallments,
            deadlineDate: summary.deadlineDate,
            hoursUntilDeadline: summary.hoursUntilDeadline
          });
          
          // Cache payment summary for quick access
          this.cachePaymentSummary(orderId, summary);
        }),
        catchError(error => {
          console.error('Error fetching payment summary:', error);
          return throwError(() => new Error('Failed to fetch payment summary: ' + this.getErrorMessage(error)));
        })
      );
  }

  // NEW METHOD - Cache payment summary
  private cachePaymentSummary(orderId: string, summary: PaymentSummary): void {
    try {
      const cacheKey = `paymentSummary_${orderId}`;
      const cacheData = {
        summary: summary,
        timestamp: Date.now(),
        expiresIn: 1000 * 60 * 5 // 5 minutes
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Could not cache payment summary:', e);
    }
  }

  // EXISTING METHOD - Get pending payments
  // NO CHANGES
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

  // EXISTING METHOD - Get recently verified payments
  // NO CHANGES
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

  // EXISTING METHOD - Verify payment
  // NO CHANGES
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

  // EXISTING METHOD - Reject payment
  // NO CHANGES
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

  // EXISTING METHOD - Get payments by order ID
  // ENHANCED with better sorting and caching
  getPaymentsByOrderId(orderId: string): Observable<Payment[]> {
    const headers = this.getHeaders();
    return this.http.get<Payment[]>(`${this.apiUrl}/${orderId}/payments`, { headers })
      .pipe(
        map(payments => {
          // Sort payments by installment number if available
          return payments.sort((a, b) => {
            if (a.installmentNumber && b.installmentNumber) {
              return a.installmentNumber - b.installmentNumber;
            }
            // Fallback to date sorting
            return new Date(a.submittedDate || '').getTime() - new Date(b.submittedDate || '').getTime();
          });
        }),
        tap(payments => {
          console.log(`Retrieved ${payments.length} payments for order ${orderId}`, payments);
        }),
        catchError(error => {
          console.error('Error fetching order payments:', error);
          return throwError(() => new Error('Failed to fetch order payments: ' + this.getErrorMessage(error)));
        })
      );
  }

  // EXISTING METHOD - Validate file type
  // ENHANCED with more file types
  private isValidFileType(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp'];
    return allowedTypes.includes(file.type);
  }

  // EXISTING METHOD - Validate file size
  // NO CHANGES
  private isValidFileSize(file: File): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    return file.size <= maxSize;
  }

  // EXISTING METHOD - Get error message
  // ENHANCED with better error parsing
  private getErrorMessage(error: any): string {
    if (error.error && error.error.message) {
      return error.error.message;
    } else if (error.message) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          return 'Bad request - please check your input';
        case 401:
          return 'Authentication required - please log in';
        case 403:
          return 'Access denied - insufficient permissions';
        case 404:
          return 'Resource not found';
        case 500:
          return 'Server error - please try again later';
        default:
          return `HTTP ${error.status} error occurred`;
      }
    } else {
      return 'Unknown error occurred';
    }
  }

  // EXISTING METHOD - Get pending payments count
  // NO CHANGES
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

  // EXISTING METHOD - Get all payments
  // NO CHANGES
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

  // ENHANCED METHOD - Get next installment info with comprehensive details
  getNextInstallmentInfo(orderId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get<any>(`${this.apiUrl}/${orderId}/next-installment`, { headers })
      .pipe(
        tap(info => {
          console.log('Next installment info:', info);
        }),
        catchError(error => {
          console.error('Error fetching next installment info:', error);
          return throwError(() => new Error('Failed to fetch next installment info: ' + this.getErrorMessage(error)));
        })
      );
  }

  // ENHANCED METHOD - Check if payment deadline has passed
  isPaymentDeadlinePassed(deadlineDate: string): boolean {
    if (!deadlineDate) return false;
    
    try {
      const deadline = new Date(deadlineDate);
      const now = new Date();
      return now > deadline;
    } catch (error) {
      console.error('Error parsing deadline date:', error);
      return false;
    }
  }

  // ENHANCED METHOD - Calculate time until deadline with better precision  
  getTimeUntilDeadline(deadlineDate: string): { hours: number, minutes: number, days: number, isPassed: boolean, isUrgent: boolean } {
    if (!deadlineDate) {
      return { hours: 0, minutes: 0, days: 0, isPassed: true, isUrgent: false };
    }
    
    try {
      const deadline = new Date(deadlineDate);
      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        return { hours: 0, minutes: 0, days: 0, isPassed: true, isUrgent: false };
      }
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      // Consider urgent if less than 12 hours remaining
      const isUrgent = diffMs < (1000 * 60 * 60 * 12);
      
      return { hours, minutes, days, isPassed: false, isUrgent };
    } catch (error) {
      console.error('Error calculating time until deadline:', error);
      return { hours: 0, minutes: 0, days: 0, isPassed: true, isUrgent: false };
    }
  }

  // ENHANCED METHOD - Format deadline for display with better formatting
  formatDeadline(deadlineDate: string): string {
    if (!deadlineDate) return 'No deadline set';
    
    try {
      const deadline = new Date(deadlineDate);
      return deadline.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting deadline date:', error);
      return 'Invalid date';
    }
  }

  // ENHANCED METHOD - Get installment plan availability based on time (using 7 days instead of 10)
  getInstallmentPlanAvailability(eventDate: string): { 
    daysUntilEvent: number,
    weeksUntilEvent: number,
    availablePlans: number[], // Plan IDs that are available
    timeConstraints: string[]
  } {
    const event = new Date(eventDate);
    const now = new Date();
    const timeDiff = event.getTime() - now.getTime();
    const daysUntilEvent = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const weeksUntilEvent = Math.floor(daysUntilEvent / 7);
    
    let availablePlans: number[] = [1]; // Full payment always available
    let timeConstraints: string[] = ['Full payment is always available'];
    
    // UPDATED: Using 7 days instead of 10 days as the threshold
    if (daysUntilEvent < 7) {
      timeConstraints = ['Less than 7 days remaining - only full payment available'];
    } else {
      if (weeksUntilEvent >= 2) {
        availablePlans.push(2); // 50% split
        timeConstraints.push('50% installment plan available (2+ weeks)');
      }
      if (weeksUntilEvent >= 3) {
        availablePlans.push(3); // 33.3% split
        timeConstraints.push('33.3% installment plan available (3+ weeks)');
      }
      if (weeksUntilEvent >= 4) {
        availablePlans.push(4); // 25% split
        timeConstraints.push('25% installment plan available (4+ weeks)');
      }
    }
    
    return {
      daysUntilEvent,
      weeksUntilEvent,
      availablePlans,
      timeConstraints
    };
  }

  // NEW METHOD - Get installment payment status for display
  getInstallmentPaymentStatus(installmentNumber: number, installments: InstallmentStatus[]): {
    status: string,
    displayText: string,
    cssClass: string,
    canPay: boolean
  } {
    const installment = installments.find(i => i.installmentNumber === installmentNumber);
    
    if (!installment) {
      return {
        status: 'unknown',
        displayText: 'Unknown',
        cssClass: 'status-unknown',
        canPay: false
      };
    }
    
    switch (installment.status) {
      case 'confirmed':
        return {
          status: 'confirmed',
          displayText: 'Paid',
          cssClass: 'status-confirmed',
          canPay: false
        };
      case 'pending':
        return {
          status: 'pending',
          displayText: installment.isCurrent ? 'Payment Pending Verification' : 'Awaiting Payment',
          cssClass: installment.isCurrent ? 'status-pending-verification' : 'status-awaiting',
          canPay: installment.isClickable
        };
      case 'rejected':
        return {
          status: 'rejected',
          displayText: 'Payment Rejected',
          cssClass: 'status-rejected',
          canPay: installment.isCurrent
        };
      default:
        return {
          status: 'unknown',
          displayText: 'Unknown Status',
          cssClass: 'status-unknown',
          canPay: false
        };
    }
  }

  // NEW METHOD - Calculate installment progress summary
  getInstallmentProgressSummary(plan: InstallmentPlan): {
    completed: number,
    total: number,
    percentage: number,
    nextAmount: number | null,
    isCompleted: boolean
  } {
    const completed = plan.completedInstallments || 0;
    const total = plan.numberOfInstallments;
    const percentage = (completed / total) * 100;
    
    let nextAmount: number | null = null;
    if (!plan.isCompleted && plan.breakdown) {
      const nextInstallment = plan.breakdown.find(b => b.isCurrent);
      nextAmount = nextInstallment ? nextInstallment.amount : null;
    }
    
    return {
      completed,
      total,
      percentage,
      nextAmount,
      isCompleted: plan.isCompleted || false
    };
  }

  // NEW METHOD - Clear cached data (useful for logout or data refresh)
  clearCache(): void {
    try {
      // Remove all payment-related cache items
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('installmentPlans') || key.startsWith('paymentSummary_')) {
          localStorage.removeItem(key);
        }
      });
      console.log('Payment service cache cleared');
    } catch (e) {
      console.warn('Error clearing payment service cache:', e);
    }
  }
}
