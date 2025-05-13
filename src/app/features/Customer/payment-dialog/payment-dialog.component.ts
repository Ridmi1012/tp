import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { PaymentService } from '../../../services/payment.service';
import { Inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {  InstallmentPlan, Payment, PaymentSummary  } from '../../../services/payment.service';




@Component({
  selector: 'app-payment-dialog',
  imports: [ CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatRadioModule,
    MatStepperModule],
  templateUrl: './payment-dialog.component.html',
  styleUrl: './payment-dialog.component.css'
})
export class PaymentDialogComponent implements OnInit {
  // Form for payment
  paymentForm: FormGroup;

  // UI state
  loading = false;
  error: string | null = null;
  success: string | null = null;
  fileValidationError: string | null = null;
  payherePaymentInProgress = false;

  // Payment data
  availableInstallmentPlans: InstallmentPlan[] = [];
  selectedInstallmentPlan: InstallmentPlan | null = null;
  currentInstallment = 1;
  selectedFile: File | null = null;

  // Order status flags
  isEventWithin10Days = false;
  daysUntilEvent = 0;
  remainingAmount = 0;
  totalAmountPaid = 0;
  
  // Payment history
  paymentSummary: PaymentSummary | null = null;
  previousPayments: Payment[] = [];
  
  // Track if payment exists
  hasActivePayment = false;
  activePayment: any = null;
  isPayingNextInstallment = false;

  // Order ID property
  private _orderId: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<PaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public order: any,
    private paymentService: PaymentService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    // Initialize form with default values
    this.paymentForm = this.fb.group({
      installmentPlan: ['', Validators.required],
      paymentMethod: ['payhere', Validators.required],
      paymentAmount: [0, [Validators.required, Validators.min(1)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    console.log('Order details:', this.order);

    // Extract order ID from the order object
    this._orderId = this.extractOrderId();
    
    if (!this._orderId) {
      this.error = 'Invalid order data: No order ID found. Please refresh and try again.';
      console.error('No order ID found in:', this.order);
      return;
    }

    console.log('Order ID:', this._orderId);

    // Check if event is within 10 days
    this.checkEventTimeframe();

    // Load payment summary and history first
    this.loadPaymentSummary();

    // Check user authentication status
    if (!this.authService.isLoggedIn()) {
      this.error = 'Authentication required. Please login to make payments.';
    } else if (!this.authService.isCustomer()) {
      this.error = 'You do not have permission to make payments. Please contact support.';
    }

    // Check for PayHere return parameters
    this.route.queryParams.subscribe(params => {
      const orderId = params['order_id'];
      const paymentId = params['payment_id'];
      const status = params['status_code'];

      console.log('Query params:', params);

      // If we have PayHere return parameters, process them
      if (orderId && paymentId && status) {
        this.processPayHereReturn(orderId, paymentId, status);
      }
    });
  }

  // Extract order ID from various possible locations in the order object
  private extractOrderId(): string | null {
    // Try common ID properties
    if (this.order?._id) return this.order._id;
    if (this.order?.id) return this.order.id;
    if (this.order?.orderId) return this.order.orderId;
    if (this.order?.order_id) return this.order.order_id;
    
    // If order is a string itself, it might be the ID
    if (typeof this.order === 'string') return this.order;
    
    return null;
  }

  loadPaymentSummary(): void {
    if (this._orderId) {
      this.paymentService.getPaymentSummary(this._orderId).subscribe({
        next: (summary) => {
          console.log('Full payment summary:', summary);
          this.paymentSummary = summary;
          
          // Check if there's an active payment
          if (summary.activePaymentId) {
            this.hasActivePayment = true;
            this.activePayment = summary.payments.find(p => p.id === summary.activePaymentId);
          }
          
          // Make sure payments are properly mapped
          if (summary.payments && summary.payments.length > 0) {
            this.previousPayments = summary.payments;
            console.log('Found payments:', this.previousPayments);
          }
          
          // Calculate payment status
          this.calculatePaymentStatus();
          
          // Determine if we should show next installment payment
          if (summary.installmentPlan && summary.currentInstallment) {
            this.currentInstallment = summary.currentInstallment;
            
            // Check if current installment is already paid
            const currentInstallmentPaid = this.previousPayments.some(
              p => p.installmentNumber === this.currentInstallment && 
                  (p.status === 'completed' || p.status === 'confirmed')
            );
            
            if (currentInstallmentPaid && this.currentInstallment < (summary.totalInstallments ?? 0)) {
              this.isPayingNextInstallment = true;
              this.currentInstallment = this.currentInstallment + 1;
            }
          }
          
          // Initialize form with correct values
          this.initializePaymentForm();
          
          // Load installment plans
          if (summary.installmentPlan) {
            // Use the plan from summary if available
            this.availableInstallmentPlans = [summary.installmentPlan];
            this.selectedInstallmentPlan = summary.installmentPlan;
          } else {
            this.loadInstallmentPlans();
          }
        },
        error: (error) => {
          console.error('Error loading payment summary:', error);
          this.calculatePaymentStatus();
          this.initializePaymentForm();
          this.loadInstallmentPlans();
        }
      });
    }
  }

  // Initialize form with defaults
  initializePaymentForm(): void {
    console.log('Initializing payment form with remaining amount:', this.remainingAmount);
    
    // Ensure remaining amount is calculated properly
    if (this.remainingAmount === 0 && this.order?.totalPrice) {
      this.remainingAmount = this.order.totalPrice;
    }
    
    // Set default values for the form based on payment state
    let defaultPlanId = 1; // Full payment by default
    let paymentAmount = this.remainingAmount || 0;
    
    // If we have an active installment plan, use it
    if (this.hasActivePayment && this.paymentSummary?.installmentPlan) {
      defaultPlanId = this.paymentSummary.installmentPlan.id;
      
      // Calculate amount for current installment
      if (this.paymentSummary.nextInstallmentAmount) {
        paymentAmount = this.paymentSummary.nextInstallmentAmount;
      }
    }
    
    this.paymentForm = this.fb.group({
      installmentPlan: [defaultPlanId, Validators.required],
      paymentMethod: ['payhere', Validators.required],
      paymentAmount: [paymentAmount, [Validators.required, Validators.min(1)]],
      notes: ['']
    });

    // Listen for payment method changes
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      console.log('Payment method changed to:', method);
    });
  }

 loadInstallmentPlans(): void {
  if (this._orderId) {
    console.log('Loading installment plans for order:', this._orderId);
    
    this.paymentService.getAvailableInstallmentPlansForOrder(this._orderId).subscribe({
      next: (plans) => {
        console.log('API returned plans:', plans);
        console.log('Type of plans:', typeof plans);
        console.log('Is plans an array?:', Array.isArray(plans));
        console.log('Plans length:', plans?.length);
        
        if (plans && Array.isArray(plans)) {
          console.log('Plans is an array with length:', plans.length);
          plans.forEach((plan, index) => {
            console.log(`Plan ${index}:`, plan);
            console.log(`  Name: ${plan.name}`);
            console.log(`  Description: ${plan.description}`);
            console.log(`  Installments: ${plan.numberOfInstallments}`);
            console.log(`  Percentages:`, plan.percentages);
          });
          
          if (plans.length > 0) {
            this.availableInstallmentPlans = plans;
            console.log('Available installment plans set to:', this.availableInstallmentPlans);
            
            // Force change detection
            setTimeout(() => {
              console.log('After timeout - available plans:', this.availableInstallmentPlans);
            }, 0);
            
            // If paying next installment, keep the same plan
            if (this.isPayingNextInstallment && this.paymentSummary?.installmentPlan) {
              this.selectedInstallmentPlan = this.paymentSummary.installmentPlan;
              this.paymentForm.get('installmentPlan')?.setValue(this.selectedInstallmentPlan.id);
              this.paymentForm.get('installmentPlan')?.disable(); // Disable plan selection for next installments
            } else {
              // Pre-select the first plan (usually full payment)
              if (this.availableInstallmentPlans.length > 0) {
                this.selectedInstallmentPlan = this.availableInstallmentPlans[0];
                this.paymentForm.get('installmentPlan')?.setValue(this.selectedInstallmentPlan.id);
              }
            }
            
            this.updatePaymentAmount();
          } else {
            // No plans in array - show error
            console.error('No installment plans available from server');
            this.showError('No payment plans available. Please contact support.');
            this.availableInstallmentPlans = [];
          }
        } else {
          // Unexpected response format
          console.error('Unexpected response format - expected array, got:', typeof plans);
          console.error('Response data:', plans);
          this.showError('Error loading payment plans. Please try again later.');
          this.availableInstallmentPlans = [];
        }
      },
      error: (error) => {
        console.error('Error loading installment plans:', error);
        console.error('Error details:', error.message, error.status);
        
        // Handle specific error cases
        if (error.status === 404) {
          this.showError('Order not found. Please check the order details.');
        } else if (error.status === 401) {
          this.showError('Authentication error. Please log in again.');
        } else {
          this.showError('Failed to load payment plans. Please try again later.');
        }
        
        // Set empty array to prevent undefined errors
        this.availableInstallmentPlans = [];
      }
    });
  } else {
    // No order ID - show error
    console.error('No order ID provided');
    this.showError('Order information is missing. Cannot load payment plans.');
    this.availableInstallmentPlans = [];
  }
}

// Add this helper method to show errors (if not already present)
private showError(message: string): void {
  this.error = message;
  // If you're using a snackbar or toast service, you can also show it there
  // this.snackBar.open(message, 'Close', { duration: 5000 });
}

  

  // Update payment amount when installment plan changes
  updatePaymentAmount(): void {
    const planId = this.paymentForm.get('installmentPlan')?.value;
    
    if (!planId) {
      console.warn('No installment plan selected');
      this.paymentForm.get('paymentAmount')?.setValue(this.remainingAmount);
      return;
    }
    
    console.log(`Updating payment amount for plan ID: ${planId}`);
    this.selectedInstallmentPlan = this.availableInstallmentPlans.find(p => p.id === planId) || null;
    
    if (this.selectedInstallmentPlan) {
      const installmentAmount = this.calculateInstallmentAmount(
        this.order?.totalPrice || 0,
        this.selectedInstallmentPlan,
        this.currentInstallment
      );
      
      this.paymentForm.get('paymentAmount')?.setValue(installmentAmount);
      console.log(`Updated payment amount for installment ${this.currentInstallment}:`, installmentAmount);
    } else {
      console.error(`Could not find installment plan with ID ${planId}`);
      this.paymentForm.get('paymentAmount')?.setValue(this.remainingAmount);
    }
  }

  // Calculate installment amount based on percentage
  calculateInstallmentAmount(totalPrice: number, plan: InstallmentPlan, installmentNumber: number): number {
    if (!plan || installmentNumber < 1 || installmentNumber > plan.numberOfInstallments) {
      console.warn('Invalid plan or installment number, returning full remaining amount');
      return this.remainingAmount;
    }
    
    const percentageIndex = installmentNumber - 1;
    if (percentageIndex >= plan.percentages.length) {
      console.warn(`Installment number ${installmentNumber} exceeds plan percentages array length`);
      return this.remainingAmount;
    }
    
    // Calculate amount from percentage
    let calculatedAmount = (plan.percentages[percentageIndex] / 100) * totalPrice;
    
    // Cap at remaining amount to prevent overpayment
    calculatedAmount = Math.min(calculatedAmount, this.remainingAmount);
    
    console.log(`Calculated amount: ${calculatedAmount} (${plan.percentages[percentageIndex]}% of ${totalPrice})`);
    return calculatedAmount;
  }

  // Handle installment plan change
  onInstallmentPlanChange(): void {
    this.updatePaymentAmount();
  }

  // Check if event is within 10 days
  checkEventTimeframe(): void {
    if (this.order?.customDetails?.eventDate) {
      const eventDate = new Date(this.order.customDetails.eventDate);
      const now = new Date();
      
      this.daysUntilEvent = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      this.isEventWithin10Days = this.daysUntilEvent <= 10;
      
      console.log(`Days until event: ${this.daysUntilEvent}, Is within 10 days: ${this.isEventWithin10Days}`);
    }
  }

  // Calculate payment status based on existing payments
  calculatePaymentStatus(): void {
    if (this.paymentSummary) {
      this.remainingAmount = this.paymentSummary.remainingAmount || 0;
      this.totalAmountPaid = this.paymentSummary.totalPaid || 0;
      
      console.log('Payment status from summary:', {
        totalAmount: this.paymentSummary.totalAmount,
        totalPaid: this.totalAmountPaid,
        remainingAmount: this.remainingAmount,
        currentInstallment: this.currentInstallment,
        installmentPlan: this.paymentSummary.installmentPlan
      });
      
      this.paymentForm?.get('paymentAmount')?.setValue(this.remainingAmount);
      return;
    }
    
    // Fallback calculation
    this.remainingAmount = this.order?.totalPrice || 0;
    
    if (this.previousPayments && this.previousPayments.length > 0) {
      this.totalAmountPaid = this.previousPayments
        .filter((payment: Payment) => payment.status === 'completed' || payment.status === 'confirmed')
        .reduce((sum: number, payment: Payment) => sum + (payment.amount || 0), 0);
      
      this.remainingAmount = Math.max(0, (this.order?.totalPrice || 0) - this.totalAmountPaid);
    }
    
    console.log('Payment status calculated:', {
      totalAmount: this.order?.totalPrice,
      totalPaid: this.totalAmountPaid,
      remainingAmount: this.remainingAmount,
      currentInstallment: this.currentInstallment
    });
  }

  // Format date for payment deadline
  getPaymentDeadline(): string {
    if (this.paymentSummary?.deadlineDate) {
      return new Date(this.paymentSummary.deadlineDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    if (this.order?.customDetails?.eventDate) {
      const eventDate = new Date(this.order.customDetails.eventDate);
      
      // Calculate deadline (12 hours before event)
      const deadlineDate = new Date(eventDate);
      deadlineDate.setHours(deadlineDate.getHours() - 12);
      
      // Format deadline time
      return deadlineDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return "Unknown";
  }

  onSubmit(): void {
    if (!this.paymentForm.valid) {
      console.error('Form is invalid', this.paymentForm.errors);
      return;
    }

    // Validate order ID before submission
    if (!this._orderId) {
      this.error = 'Order ID is missing. Cannot process payment.';
      return;
    }
    
    // Reset error and success states
    this.loading = true;
    this.error = null;
    this.success = null;
    
    // Get form values
    const formValues = this.paymentForm.value;
    const paymentMethod = formValues.paymentMethod;
    const installmentPlanId = formValues.installmentPlan;
    const amount = formValues.paymentAmount;
    const notes = formValues.notes;
    
    console.log('Submitting payment:', {
      orderId: this._orderId,
      amount: amount,
      method: paymentMethod,
      installmentPlanId: installmentPlanId,
      installmentNumber: this.currentInstallment,
      notes: notes
    });
    
    // Check authentication
    if (!this.authService.isLoggedIn()) {
      this.error = 'Authentication required. Please login to make payments.';
      this.loading = false;
      return;
    }
    
    if (!this.authService.isCustomer()) {
      this.error = 'You do not have permission to make payments. Only customers can make payments.';
      this.loading = false;
      return;
    }
    
    // Process payment based on method
    if (paymentMethod === 'payhere') {
      this.processPayHerePayment(amount, installmentPlanId, notes);
    } else {
      // For bank transfers, validate file upload
      if (!this.selectedFile) {
        this.error = 'Please upload payment slip for bank transfers';
        this.loading = false;
        return;
      }
      this.processManualPayment(amount, installmentPlanId, notes);
    }
  }

  // Process PayHere payment
  processPayHerePayment(amount: number, installmentPlanId?: number, notes?: string): void {
    if (!this._orderId) {
      this.error = 'Order ID is missing. Cannot process payment.';
      this.loading = false;
      return;
    }

    this.payherePaymentInProgress = true;
    
    console.log('Initiating PayHere payment:', {
      orderId: this._orderId,
      amount: amount,
      installmentPlanId: installmentPlanId,
      installmentNumber: this.currentInstallment
    });
    
    this.paymentService.initiatePayment(
      this._orderId, 
      amount, 
      'payhere',
      installmentPlanId,
      this.currentInstallment,
      notes
    )
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (response) => {
          console.log('PayHere initiation successful:', response);
          this.success = 'Preparing payment gateway. Please wait...';
        },
        error: (error) => {
          this.payherePaymentInProgress = false;
          console.error('Payment initiation error:', error);
          this.error = error.message || 'Failed to initiate payment. Please try again.';
          
          // Handle authentication errors
          if (error.message && (error.message.includes('session expired') || 
                               error.message.includes('log in again'))) {
            setTimeout(() => {
              this.authService.logout();
            }, 2000);
          }
        }
      });
  }

  // Process manual payment (bank transfer with slip)
  processManualPayment(amount: number, installmentPlanId?: number, notes?: string): void {
    if (!this._orderId) {
      this.error = 'Order ID is missing. Cannot process payment.';
      this.loading = false;
      return;
    }

    if (!this.selectedFile) {
      this.error = 'Please upload payment slip for bank transfers';
      this.loading = false;
      return;
    }
    
    // Create a loading message
    this.success = 'Uploading payment slip...';
    
    console.log('Processing manual payment:', {
      orderId: this._orderId,
      amount: amount,
      installmentPlanId: installmentPlanId,
      installmentNumber: this.currentInstallment
    });
    
    // Add automatic reminder for installment payments
    let paymentNotes = notes || '';
    if (this.selectedInstallmentPlan && this.selectedInstallmentPlan.numberOfInstallments > 1) {
      const reminderText = `This is installment ${this.currentInstallment} of ${this.selectedInstallmentPlan.numberOfInstallments}. The full payment must be completed at least 12 hours before your event.`;
      paymentNotes = paymentNotes ? paymentNotes + "\n\n" + reminderText : reminderText;
    }
    
    // Determine if this is a partial payment
    const isPartialPayment = this.selectedInstallmentPlan && 
                             this.selectedInstallmentPlan.numberOfInstallments > 1 &&
                             this.currentInstallment < this.selectedInstallmentPlan.numberOfInstallments;
    
    // Upload the payment slip
    this.paymentService.uploadPaymentSlip(
      this._orderId, 
      this.selectedFile, 
      amount,
      isPartialPayment ?? false,
      installmentPlanId,
      this.currentInstallment,
      paymentNotes
    )
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (response) => {
        console.log('Payment slip upload successful:', response);
        this.success = 'Payment slip uploaded successfully. Awaiting admin verification.';
        
        // Show different message for installments
        if (this.selectedInstallmentPlan && this.selectedInstallmentPlan.numberOfInstallments > 1) {
          this.success = `Installment ${this.currentInstallment} payment slip uploaded successfully. Awaiting admin verification.`;
        }
        
        setTimeout(() => {
          this.dialogRef.close(true);
        }, 2000);
      },
      error: (error) => {
        this.loading = false;
        console.error('Upload error:', error);
        this.error = error.message || 'Failed to upload payment slip. Please try again.';
        
        // Handle authentication errors
        if (error.message && (error.message.includes('session expired') || 
                             error.message.includes('log in again'))) {
          setTimeout(() => {
            this.authService.logout();
          }, 2000);
        }
      }
    });
  }

  // Process return from PayHere
  processPayHereReturn(orderId: string, paymentId: string, status: string): void {
    this.loading = true;
    this.error = null;
    this.success = null;
    
    console.log('Processing PayHere return:', { orderId, paymentId, status });
    
    // Status code 2 indicates successful payment
    if (status === '2') {
      // Verify the payment
      this.paymentService.verifyPayHerePayment(orderId, paymentId)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: (response) => {
            console.log('PayHere verification successful:', response);
            this.success = 'Payment completed successfully. Your order has been updated.';
            
            // Close dialog after a delay
            setTimeout(() => {
              this.dialogRef.close(true);
            }, 3000);
          },
          error: (error) => {
            console.error('PayHere verification error:', error);
            this.error = 'There was an issue verifying your payment. Please contact support.';
          }
        });
    } else {
      this.loading = false;
      this.error = 'Payment was not successful. Please try again or contact support.';
    }
  }

  // Handle file selection for bank transfer
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.fileValidationError = 'Please upload an image file (JPG, PNG, GIF, WEBP)';
        this.selectedFile = null;
        return;
      }
      
      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.fileValidationError = 'File size must be less than 5MB';
        this.selectedFile = null;
        return;
      }
      
      this.fileValidationError = null;
      this.selectedFile = file;
    }
  }
  
  // Get formatted time until event
  getTimeUntilEvent(): string {
    if (this.daysUntilEvent <= 0) {
      return "Event has already started";
    }
    
    if (this.daysUntilEvent > 0) {
      return `${this.daysUntilEvent} day${this.daysUntilEvent !== 1 ? 's' : ''}`;
    }
    
    return "Soon";
  }
  
  // Get current installment amount for display
  getCurrentInstallmentAmount(): number {
    if (!this.selectedInstallmentPlan) {
      return 0;
    }
    
    return this.calculateInstallmentAmount(
      this.order?.totalPrice || 0,
      this.selectedInstallmentPlan,
      this.currentInstallment
    );
  }
  
  // formatDate method that handles undefined
  formatDate(date: string | undefined): string {
    if (!date) return 'Date not available';
    
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }
  
  // Get payment history for display
  getPaymentHistory(): Payment[] {
    if (this.previousPayments && this.previousPayments.length > 0) {
      // Sort by date (most recent first)
      return [...this.previousPayments].sort((a, b) => {
        const dateA = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
        const dateB = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
        return dateB - dateA;
      });
    }
    return [];
  }
  
  // Get formatted payment status
  getPaymentStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Paid';
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending Verification';
      case 'rejected': return 'Rejected';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  }
  
  // Check if should show make payment button
  shouldShowMakePaymentButton(): boolean {
    // If event is within 10 days, only show full payment
    if (this.isEventWithin10Days && this.availableInstallmentPlans.length === 1) {
      return true;
    }
    
    // If there's no active payment yet
    if (!this.hasActivePayment) {
      return true;
    }
    
    // If paying next installment
    if (this.isPayingNextInstallment) {
      return true;
    }
    
    // If order is confirmed but not fully paid
    return (
      (this.order?.status === 'confirmed' || this.order?.paymentStatus === 'partial') && 
      !this.paymentSummary?.isFullyPaid
    );
  }
  
  // Get button text based on state
  getPaymentButtonText(): string {
    if (this.loading) return 'Processing...';
    
    if (this.isPayingNextInstallment && this.selectedInstallmentPlan) {
      return `Pay Installment ${this.currentInstallment} of ${this.selectedInstallmentPlan.numberOfInstallments}`;
    }
    
    if (this.hasActivePayment && this.paymentSummary?.installmentPlan) {
      return `Pay Next Installment (${this.currentInstallment})`;
    }
    
    return 'Process Payment';
  }
  
  // Close dialog
  closeDialog(): void {
    // Only close if we're not in the middle of a PayHere payment
    if (!this.payherePaymentInProgress) {
      this.dialogRef.close(false);
    } else {
      this.error = 'Payment is in progress. Please complete or cancel the payment before closing.';
    }
  }
  
  // Check if an installment is completed
  isPaymentCompleted(installmentNumber: number): boolean {
    const payment = this.previousPayments.find(p => p.installmentNumber === installmentNumber);
    return payment ? payment.status === 'completed' || payment.status === 'confirmed' : false;
  }
  
  // Get installment amount
  getInstallmentAmount(installmentNumber: number): number {
    if (!this.paymentSummary?.installmentPlan) return 0;
    
    const plan = this.paymentSummary.installmentPlan;
    const percentageIndex = installmentNumber - 1;
    
    if (percentageIndex >= 0 && percentageIndex < plan.percentages.length) {
      return (plan.percentages[percentageIndex] / 100) * (this.order?.totalPrice || 0);
    }
    
    return 0;
  }
  
  // Get installment status
  getInstallmentStatus(installmentNumber: number): string {
    const payment = this.previousPayments.find(p => p.installmentNumber === installmentNumber);
    
    if (!payment) {
      if (installmentNumber === this.currentInstallment) {
        return 'Due Now';
      }
      return 'Pending';
    }
    
    switch (payment.status) {
      case 'completed':
      case 'confirmed':
        return 'Paid';
      case 'pending':
        return 'Awaiting Verification';
      case 'rejected':
        return 'Rejected';
      default:
        return payment.status;
    }
  }

  getInstallmentChipColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'confirmed':
      case 'paid':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'rejected':
        return 'warn';
      default:
        return '';
    }
  }

  getInstallmentStatusText(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'confirmed':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      case 'overdue':
        return 'Overdue';
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }
  }
}