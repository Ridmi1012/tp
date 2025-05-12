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

    // Check if event is within 10 days
    this.checkEventTimeframe();

    // Load payment summary and history
    this.loadPaymentSummary();

    // Initialize form with default values
    this.initializePaymentForm();

    // Load available installment plans
    this.loadInstallmentPlans();

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

  // Load payment summary 
  loadPaymentSummary(): void {
    if (this.order?._id) {
      this.paymentService.getPaymentSummary(this.order._id).subscribe({
        next: (summary) => {
          this.paymentSummary = summary;
          console.log('Payment summary:', summary);
          
          // Set previous payments from summary
          if (summary.payments && summary.payments.length > 0) {
            this.previousPayments = summary.payments;
            console.log('Previous payments:', this.previousPayments);
          }
          
          // Calculate payment status
          this.calculatePaymentStatus();
        },
        error: (error) => {
          console.error('Error loading payment summary:', error);
          // Fallback to basic calculation
          this.calculatePaymentStatus();
        }
      });
    }
  }

  // Initialize form with defaults
  initializePaymentForm(): void {
    // Set default values for the form
    this.paymentForm = this.fb.group({
      installmentPlan: [1, Validators.required], // Default to full payment (ID: 1)
      paymentMethod: ['payhere', Validators.required],
      paymentAmount: [this.remainingAmount, [Validators.required, Validators.min(1)]],
      notes: ['']
    });

    // Listen for payment method changes
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      console.log('Payment method changed to:', method);
    });
  }

  // Load installment plans from the server
  loadInstallmentPlans(): void {
    if (this.order?._id) {
      console.log('Loading installment plans for order:', this.order._id);
      
      this.paymentService.getAvailableInstallmentPlansForOrder(this.order._id).subscribe({
        next: (plans) => {
          if (plans && plans.length > 0) {
            this.availableInstallmentPlans = plans;
            console.log('Available installment plans:', this.availableInstallmentPlans);
          } else {
            // Fallback to local implementation
            console.log('No plans returned from API, using local implementation');
            this.availableInstallmentPlans = this.getLocalInstallmentPlans();
          }
          
          // Pre-select the first plan (usually full payment)
          if (this.availableInstallmentPlans.length > 0) {
            this.selectedInstallmentPlan = this.availableInstallmentPlans[0];
            this.paymentForm.get('installmentPlan')?.setValue(this.selectedInstallmentPlan.id);
            this.updatePaymentAmount();
          } else {
            console.error('No installment plans available');
          }
        },
        error: (error) => {
          console.error('Error loading installment plans:', error);
          // Fallback to local implementation
          this.availableInstallmentPlans = this.getLocalInstallmentPlans();
          
          // Pre-select the first plan
          if (this.availableInstallmentPlans.length > 0) {
            this.selectedInstallmentPlan = this.availableInstallmentPlans[0];
            this.paymentForm.get('installmentPlan')?.setValue(this.selectedInstallmentPlan.id);
            this.updatePaymentAmount();
          }
        }
      });
    }
  }

  // Fallback method for installment plans if API fails
  getLocalInstallmentPlans(): InstallmentPlan[] {
    // Default installment plans
    const plans: InstallmentPlan[] = [
      {
        id: 1,
        name: 'Full Payment',
        numberOfInstallments: 1,
        percentages: [100],
        description: 'Pay the full amount in one payment'
      }
    ];
    
    // Add installment options based on time until event
    if (!this.isEventWithin10Days) {
      plans.push(
        {
          id: 2,
          name: '50% Split',
          numberOfInstallments: 2,
          percentages: [50, 50],
          description: 'Pay 50% now, 50% later'
        }
      );
      
      // Only add 3-4 installment options if the event is more than 30 days away
      if (this.daysUntilEvent > 30) {
        plans.push(
          {
            id: 3,
            name: '33% Split',
            numberOfInstallments: 3,
            percentages: [33.34, 33.33, 33.33],
            description: 'Pay in three equal installments'
          },
          {
            id: 4,
            name: '25% Split',
            numberOfInstallments: 4,
            percentages: [25, 25, 25, 25],
            description: 'Pay in four equal installments'
          }
        );
      }
    }
    
    console.log('Generated local installment plans:', plans);
    return plans;
  }

  // Update payment amount when installment plan changes
  updatePaymentAmount(): void {
    const planId = this.paymentForm.get('installmentPlan')?.value;
    
    if (!planId) {
      console.warn('No installment plan selected');
      // Default to full remaining amount
      this.paymentForm.get('paymentAmount')?.setValue(this.remainingAmount);
      return;
    }
    
    console.log(`Updating payment amount for plan ID: ${planId}`);
    this.selectedInstallmentPlan = this.availableInstallmentPlans.find(p => p.id === planId) || null;
    
    if (this.selectedInstallmentPlan) {
      const installmentAmount = this.calculateInstallmentAmount(
        this.order.totalPrice || 0,
        this.selectedInstallmentPlan,
        this.currentInstallment
      );
      
      this.paymentForm.get('paymentAmount')?.setValue(installmentAmount);
      console.log(`Updated payment amount for installment ${this.currentInstallment}:`, installmentAmount);
    } else {
      console.error(`Could not find installment plan with ID ${planId}`);
      // Fallback to full remaining amount
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
    // If we have payment summary, use it
    if (this.paymentSummary) {
      this.remainingAmount = this.paymentSummary.remainingAmount || 0;
      this.totalAmountPaid = this.paymentSummary.totalPaid || 0;
      this.currentInstallment = this.paymentSummary.currentInstallment || 1;
      
      console.log('Payment status from summary:', {
        totalAmount: this.paymentSummary.totalAmount,
        totalPaid: this.totalAmountPaid,
        remainingAmount: this.remainingAmount,
        currentInstallment: this.currentInstallment
      });
      return;
    }
    
    // Default remaining amount is total price
    this.remainingAmount = this.order.totalPrice || 0;
    
    // Calculate total paid amount from payments
    if (this.order.payments && this.order.payments.length > 0) {
      this.totalAmountPaid = this.order.payments
        .filter((payment: any) => payment.status === 'completed')
        .reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        
      this.remainingAmount = Math.max(0, this.remainingAmount - this.totalAmountPaid);
      
      // Determine current installment number
      if (this.order.installmentPlanId) {
        // Find completed payments to determine current installment
        const completedPayments = this.order.payments.filter((p: any) => p.status === 'completed').length;
        this.currentInstallment = Math.min(completedPayments + 1, this.order.installmentTotalInstallments || 1);
      }
    }
    
    console.log('Payment status calculated:', {
      totalAmount: this.order.totalPrice,
      totalPaid: this.totalAmountPaid,
      remainingAmount: this.remainingAmount,
      currentInstallment: this.currentInstallment
    });
  }

  // Handle file selection for payment slip
  onFileSelected(event: any): void {
    this.fileValidationError = null;
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.fileValidationError = 'Invalid file type. Please upload a jpg, png, or gif image.';
      event.target.value = '';
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      this.fileValidationError = 'File size exceeds 5MB limit.';
      event.target.value = '';
      return;
    }
    
    this.selectedFile = file;
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
      orderId: this.order._id,
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
    this.payherePaymentInProgress = true;
    
    console.log('Initiating PayHere payment:', {
      orderId: this.order._id,
      amount: amount,
      installmentPlanId: installmentPlanId,
      installmentNumber: this.currentInstallment
    });
    
    this.paymentService.initiatePayment(
      this.order._id, 
      amount, 
      'payhere',
      installmentPlanId,
      this.currentInstallment,
      notes
    )
      .pipe(finalize(() => {
        this.loading = false;
        // Don't set payherePaymentInProgress to false here because 
        // the user will be redirected to PayHere and away from this dialog
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
    if (!this.selectedFile) {
      this.error = 'Please upload payment slip for bank transfers';
      this.loading = false;
      return;
    }
    
    // Create a loading message
    this.success = 'Uploading payment slip...';
    
    console.log('Processing manual payment:', {
      orderId: this.order._id,
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
      this.order._id, 
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
      this.order.totalPrice || 0,
      this.selectedInstallmentPlan,
      this.currentInstallment
    );
  }
  
 // Alternative formatDate method that handles undefined
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
      case 'pending': return 'Pending Verification';
      case 'rejected': return 'Rejected';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
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
}