import { Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { Inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CategoryService } from '../../../services/category.service';
import { OrderService } from '../../../services/order.service';
import { PaymentDialogComponent } from '../payment-dialog/payment-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { PaymentHistoryComponent } from '../payment-history/payment-history.component';
import { PaymentSummary} from '../../../services/payment.service';
import { PaymentService , Payment, InstallmentPlanDetails, InstallmentOptions} from '../../../services/payment.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

interface StatusStep {
  label: string;
  completed: boolean;
  icon: string;
  date?: any;
  active?: boolean;
  pending?: boolean;
  message?: string;
  isCancelled?: boolean;
  cancellationReason?: string;
  installmentDetails?: {
    percentage: number;
    amount: number;
    status: string;
    installmentNumber?: number;
    isClickable?: boolean;
  };
}


@Component({
  selector: 'app-order-details-dialog',
  imports: [
      CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressBarModule, // ADD THIS
    MatTooltipModule,     // ADD THIS
    DatePipe
  ],
  templateUrl: './order-details-dialog.component.html',
  styleUrl: './order-details-dialog.component.css'
})
export class OrderDetailsDialogComponent implements OnInit{
   categoryName: string = '';
  paymentSummary: PaymentSummary | null = null;
  installmentOptions: InstallmentOptions | null = null;
  installmentPlanDetails: InstallmentPlanDetails | null = null;
  loading: boolean = false;
  error: string | null = null;
  
  // NEW: Enhanced tracking properties
  deadlineInfo: {
    formatted: string;
    timeUntil: any;
    isUrgent: boolean;
    isPassed: boolean;
  } | null = null;
  
  constructor(
    public dialogRef: MatDialogRef<OrderDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public order: any,
    private categoryService: CategoryService,
    private orderService: OrderService,
    private paymentService: PaymentService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCategoryName();
    
    // Log the order object to debug
    console.log('Order data received:', this.order);
    
    // Check if basePrice exists, if not load the design to get it
    if (!this.order.basePrice && this.order.designId) {
      this.loadDesignDetails();
    }
    
    // Load comprehensive payment and installment information
    this.loadPaymentData();
  }
  
  /**
   * ENHANCED METHOD - Load all payment-related data comprehensively
   */
  loadPaymentData(): void {
    console.log('Loading comprehensive payment data for order:', this.order._id);
    this.loading = true;
    this.error = null;
    
    // Load payment summary first
    this.paymentService.getPaymentSummary(this.order._id).subscribe({
      next: (summary) => {
        this.paymentSummary = summary;
        console.log('Payment summary loaded:', summary);
        
        // Calculate deadline information if available
        if (summary.deadlineDate) {
          this.calculateDeadlineInfo(summary.deadlineDate);
        }
        
        // Extract installment information from summary
        if (summary.payments) {
          this.order.payments = summary.payments;
        }
        
        // If there's an installment plan, load detailed installment options
        if (summary.installmentPlan && summary.totalInstallments && summary.totalInstallments > 1) {
          this.loadInstallmentOptions();
          this.loadInstallmentPlanDetails();
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading payment summary:', error);
        this.error = 'Failed to load payment information';
        this.calculatePaymentSummary(); // Fallback calculation
        this.loading = false;
      }
    });
  }

  /**
   * NEW METHOD - Load installment options for dropdown display
   */
  loadInstallmentOptions(): void {
    this.paymentService.getInstallmentOptions(this.order._id).subscribe({
      next: (options) => {
        this.installmentOptions = options;
        console.log('Installment options loaded:', options);
      },
      error: (error) => {
        console.error('Error loading installment options:', error);
        // Don't set this.error as it's not critical
      }
    });
  }

  /**
   * NEW METHOD - Load detailed installment plan information
   */
  loadInstallmentPlanDetails(): void {
    this.paymentService.getInstallmentPlanDetails(this.order._id).subscribe({
      next: (details) => {
        this.installmentPlanDetails = details;
        console.log('Installment plan details loaded:', details);
      },
      error: (error) => {
        console.error('Error loading installment plan details:', error);
        // Don't set this.error as it's not critical
      }
    });
  }

  /**
   * NEW METHOD - Calculate deadline information with enhanced details
   */
  calculateDeadlineInfo(deadlineDate: string): void {
    const formatted = this.paymentService.formatDeadline(deadlineDate);
    const timeUntil = this.paymentService.getTimeUntilDeadline(deadlineDate);
    const isUrgent = timeUntil.isUrgent;
    const isPassed = timeUntil.isPassed;
    
    this.deadlineInfo = {
      formatted,
      timeUntil,
      isUrgent,
      isPassed
    };
    
    console.log('Deadline info calculated:', this.deadlineInfo);
  }

  /**
   * EXISTING METHOD - Load design details
   * NO CHANGES
   */
  loadDesignDetails(): void {
    if (this.order.designId) {
      console.log('Loading design details for design ID:', this.order.designId);
      this.orderService.getDesignById(this.order.designId).subscribe({
        next: (design) => {
          if (design && design.basePrice) {
            console.log('Retrieved base price from design:', design.basePrice);
            this.order.basePrice = design.basePrice;
          } else {
            console.warn('Design retrieved but no base price found');
          }
        },
        error: (error) => {
          console.error('Error loading design details:', error);
        }
      });
    }
  }

  /**
   * EXISTING METHOD - Load category name
   * NO CHANGES
   */
  loadCategoryName(): void {
    if (this.order?.customDetails?.eventCategory) {
      this.categoryService.getCategoryById(this.order.customDetails.eventCategory).subscribe({
        next: (category) => {
          this.categoryName = category.name;
        },
        error: (error) => {
          console.error('Error loading category:', error);
          this.categoryName = 'Unknown Category';
        }
      });
    }
  }

  /**
   * EXISTING METHOD - Calculate payment summary (fallback)
   * ENHANCED with better typing and error handling
   */
  calculatePaymentSummary(): void {
    console.log('Calculating fallback payment summary');
    
    // Default values
    this.paymentSummary = {
      totalAmount: this.order.totalPrice || 0,
      totalPaid: 0,
      remainingAmount: 0,
      isFullyPaid: false,
      paymentStatus: 'pending',
      payments: []
    };
    
    // Check if order status indicates payment is complete
    const paymentCompletedStatus = ['paid', 'in-progress', 'ready', 'delivered'];
    const isStatusCompleted = paymentCompletedStatus.includes(this.order.status);
    const isPaymentCompleted = this.order.paymentStatus === 'completed';
    
    // If order status or payment status indicates payment is complete
    if (isStatusCompleted || isPaymentCompleted) {
      this.paymentSummary.totalPaid = this.paymentSummary.totalAmount;
      this.paymentSummary.remainingAmount = 0;
      this.paymentSummary.isFullyPaid = true;
      this.paymentSummary.paymentStatus = 'completed';
    } else {
      // Calculate total paid from payments
      if (this.order.payments && this.order.payments.length > 0) {
        this.paymentSummary.totalPaid = this.order.payments
          .filter((payment: Payment) => payment.status === 'completed')
          .reduce((sum: number, payment: Payment) => sum + (payment.amount || 0), 0);
      }
      
      // Calculate remaining amount
      this.paymentSummary.remainingAmount = Math.max(0, this.paymentSummary.totalAmount - this.paymentSummary.totalPaid);
      
      // Determine if fully paid
      this.paymentSummary.isFullyPaid = this.paymentSummary.remainingAmount === 0 && this.paymentSummary.totalPaid > 0;
      
      // Set payment status
      this.paymentSummary.paymentStatus = this.paymentSummary.isFullyPaid ? 'completed' : 
                                         (this.paymentSummary.totalPaid > 0 ? 'partial' : 'pending');
    }
    
    // Calculate deadline (24 hours before event) - only if not fully paid
    if (!this.paymentSummary.isFullyPaid && this.order?.customDetails?.eventDate) {
      const eventDate = new Date(this.order.customDetails.eventDate);
      
      // If event time is also provided, set the hours and minutes
      if (this.order.customDetails.eventTime) {
        const [hours, minutes] = this.order.customDetails.eventTime.split(':');
        eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      }
      
      // Calculate deadline (24 hours before event)
      const deadlineDate = new Date(eventDate);
      deadlineDate.setHours(deadlineDate.getHours() - 24);
      
      this.paymentSummary.deadlineDate = deadlineDate.toISOString();
      this.calculateDeadlineInfo(this.paymentSummary.deadlineDate);
    }
    
    // Use the payments from the order
    this.paymentSummary.payments = this.order.payments || [];
  }

  /**
   * ENHANCED METHOD - Get payment message with installment awareness
   */
  getPaymentMessage(): string {
    if (!this.paymentSummary) return '';
    
    if (this.order.status === 'confirmed' || this.paymentSummary.totalPaid > 0) {
      const eventDate = new Date(this.order.customDetails.eventDate);
      const now = new Date();
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (this.paymentSummary.totalPaid > 0 && !this.paymentSummary.isFullyPaid) {
        let message = `Remaining payment of Rs. ${this.paymentSummary.remainingAmount?.toFixed(2)}`;
        
        // ENHANCED: Add installment-specific information
        if (this.paymentSummary.installmentPlan && this.paymentSummary.currentInstallment) {
          const installmentInfo = ` (Installment ${this.paymentSummary.currentInstallment} of ${this.paymentSummary.installmentPlan.numberOfInstallments})`;
          message += installmentInfo;
          
          // Add next installment amount if available
          if (this.paymentSummary.nextInstallmentAmount) {
            message += ` - Next payment: Rs. ${this.paymentSummary.nextInstallmentAmount.toFixed(2)}`;
          }
        }
        
        // Add urgency based on deadline
        if (this.deadlineInfo) {
          if (this.deadlineInfo.isPassed) {
            message += ' - DEADLINE PASSED';
          } else if (this.deadlineInfo.isUrgent) {
            message += ' - URGENT: Payment due soon';
          } else if (hoursUntilEvent < 24) {
            message += ' must be completed immediately.';
          } else {
            message += ' must be completed before your event.';
          }
        }
        
        return message;
      } else if (this.paymentSummary.totalPaid === 0) {
        if (hoursUntilEvent < 24) {
          return 'Your event is in less than 24 hours. Please pay the full amount to confirm.';
        } else {
          return 'Pay full amount or choose an installment plan to confirm your order.';
        }
      }
    }
    return '';
  }

  /**
   * ENHANCED METHOD - Get status steps with comprehensive installment tracking
   */
  getStatusSteps(): StatusStep[] {
    const isPartiallyPaid = this.paymentSummary?.paymentStatus === 'partial';
    const isFullyPaid = this.paymentSummary?.isFullyPaid || this.order.paymentStatus === 'completed';
    const hasInstallmentPlan = this.paymentSummary?.installmentPlan && this.paymentSummary.totalInstallments && this.paymentSummary.totalInstallments > 1;
    
    // Check for rejected payments
    const rejectedPayment = this.order.payments?.find((payment: Payment) => payment.status === 'rejected');
    
    const steps: StatusStep[] = [
      { 
        label: 'Order Request Sent', 
        completed: true,
        icon: 'send',
        date: this.order.createdAt
      },
      { 
        label: 'Order Request Viewed', 
        completed: ['viewed', 'confirmed', 'partial-payment', 'paid', 'in-progress', 'ready', 'delivered'].includes(this.order.status),
        icon: 'visibility',
        date: this.order.status !== 'pending' ? this.order.updatedAt : null
      },
      { 
        label: this.order.status === 'cancelled' ? 'Order Cancelled' : 'Order Accepted', 
        completed: this.order.status !== 'pending' && this.order.status !== 'viewed',
        icon: this.order.status === 'cancelled' ? 'cancel' : 'check_circle',
        date: this.order.status === 'cancelled' || this.order.status === 'confirmed' ? this.order.updatedAt : null,
        isCancelled: this.order.status === 'cancelled',
        cancellationReason: this.order.cancellationReason
      },
      { 
        label: 'Awaiting Payment', 
        completed: isPartiallyPaid || isFullyPaid || ['partial-payment', 'paid', 'in-progress', 'ready', 'delivered'].includes(this.order.status),
        active: this.order.status === 'confirmed' && !isPartiallyPaid && !isFullyPaid,
        icon: 'payment',
        message: this.getPaymentMessage()
      }
    ];

    // Add payment rejection step if there's a rejected payment
    if (rejectedPayment) {
      steps.push({ 
        label: 'Payment Rejected', 
        completed: false,
        active: true,
        icon: 'error',
        date: rejectedPayment.updatedAt,
        message: `Payment rejected: ${rejectedPayment.rejectionReason || 'Please check with your bank'}`,
        isCancelled: true
      });
    }

    // ENHANCED: Add installment-specific steps with detailed tracking
    if (hasInstallmentPlan && this.installmentOptions) {
      // Add individual installment steps
      this.installmentOptions.installments.forEach((installment, index) => {
        const stepLabel = `Installment ${installment.number} of ${this.installmentOptions!.totalInstallments}`;
        const isInstallmentCompleted = installment.status === 'confirmed' || installment.isCompleted;
        const isInstallmentCurrent = installment.isCurrent;
        const isInstallmentRejected = installment.status === 'rejected';
        
        steps.push({
          label: stepLabel,
          completed: isInstallmentCompleted,
          active: isInstallmentCurrent && !isInstallmentCompleted && !isInstallmentRejected,
          icon: isInstallmentCompleted ? 'paid' : (isInstallmentRejected ? 'error' : 'payment'),
          date: isInstallmentCompleted ? this.order.updatedAt : null,
          isCancelled: isInstallmentRejected,
          message: this.getInstallmentStepMessage(installment),
          installmentDetails: {
            percentage: installment.percentage,
            amount: installment.amount,
            status: installment.status,
            installmentNumber: installment.number,
            isClickable: installment.isClickable
          }
        });
      });
    } else if (isPartiallyPaid && !hasInstallmentPlan) {
      // Fallback for partial payments without installment plan
      steps.push({ 
        label: 'Partial Payment Confirmed', 
        completed: true,
        icon: 'attach_money',
        date: this.order.updatedAt,
        message: `Rs. ${this.paymentSummary?.totalPaid?.toFixed(2)} paid. Remaining: Rs. ${this.paymentSummary?.remainingAmount?.toFixed(2)}`
      });
    }

    // Add final payment completion step
    if (
      !isFullyPaid ||
      (hasInstallmentPlan &&
        this.installmentOptions &&
        (this.installmentOptions?.completedInstallments ?? 0) < (this.installmentOptions?.totalInstallments ?? 0))
    ) {
      steps.push({ 
        label: 'Payment Completed', 
        completed: isFullyPaid,
        icon: 'verified',
        date: isFullyPaid ? this.order.updatedAt : null,
        message: isFullyPaid ? 'All payments completed successfully' : undefined
      });
    }

    // Add event-specific steps
    const eventDate = new Date(this.order.customDetails.eventDate);
    const now = new Date();
    const timeUntilEvent = eventDate.getTime() - now.getTime();
    const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);
    
    // Only show "Tomorrow is your event" if payment is completed and event is tomorrow
    if (isFullyPaid && hoursUntilEvent > 0 && hoursUntilEvent <= 48) {
      steps.push({ 
        label: 'Tomorrow is your event', 
        completed: hoursUntilEvent <= 24,
        active: hoursUntilEvent > 24 && hoursUntilEvent <= 48,
        icon: 'event',
        message: `Event at ${this.formatTime(this.order.customDetails.eventTime)} at ${this.order.customDetails.venue}`
      });
    }

    // Add "Event Done" if the event has passed
    if (now > eventDate) {
      steps.push({ 
        label: 'Event Done', 
        completed: true,
        icon: 'celebration'
      });
    }

    return steps;
  }

  /**
   * NEW METHOD - Get installment step message
   */
  getInstallmentStepMessage(installment: any): string {
    const statusInfo = this.paymentService.getInstallmentPaymentStatus(installment.number, this.installmentPlanDetails?.planDetails?.installmentStatuses || []);
    
    let message = `Rs. ${installment.amount.toFixed(2)} (${installment.percentage}%)`;
    
    if (installment.transactionId) {
      message += ` - Transaction: ${installment.transactionId}`;
    }
    
    if (installment.status === 'rejected') {
      message += ' - Please retry payment';
    } else if (installment.status === 'pending' && installment.isCurrent) {
      message += ' - Payment verification pending';
    }
    
    return message;
  }

  /**
   * EXISTING METHOD - Get installment chip color
   * ENHANCED with more status types
   */
  getInstallmentChipColor(status: string): string {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'rejected':
      case 'failed':
        return 'warn';
      default:
        return 'accent';
    }
  }

  /**
   * EXISTING METHOD - Get installment status text
   * ENHANCED with more descriptive text
   */
  getInstallmentStatusText(status: string): string {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'rejected':
      case 'failed':
        return 'Rejected';
      default:
        return status || 'Unknown';
    }
  }

  /**
   * ENHANCED METHOD - Open payment dialog with installment support
   */
  openPaymentDialog(): void {
    const dialogData = {
      ...this.order,
      paymentSummary: this.paymentSummary,
      installmentOptions: this.installmentOptions,
      installmentPlanDetails: this.installmentPlanDetails,
      deadlineInfo: this.deadlineInfo
    };
    
    console.log('Opening payment dialog with data:', dialogData);
    
    this.dialog.open(PaymentDialogComponent, {
      width: '600px',
      data: dialogData
    }).afterClosed().subscribe(result => {
      if (result) {
        console.log('Payment dialog closed with result:', result);
        // Refresh order data if payment was successful
        this.refreshOrderData();
      }
    });
  }

  /**
   * NEW METHOD - Refresh order data after payment
   */
  refreshOrderData(): void {
    console.log('Refreshing order data after payment');
    this.orderService.getOrderById(this.order._id).subscribe({
      next: (updatedOrder) => {
        this.order = updatedOrder;
        // Reload all payment data with updated order
        this.loadPaymentData();
      },
      error: (error) => {
        console.error('Error refreshing order:', error);
        // Still try to reload payment data in case order update failed but payment succeeded
        this.loadPaymentData();
      }
    });
  }
  
  /**
   * ENHANCED METHOD - Open payment history dialog with installment details
   */
  openPaymentHistoryDialog(): void {
    const dialogData = {
      order: this.order,
      paymentSummary: this.paymentSummary,
      installmentOptions: this.installmentOptions,
      installmentPlanDetails: this.installmentPlanDetails
    };
    
    this.dialog.open(PaymentHistoryComponent, {
      width: '800px',
      data: dialogData
    });
  }

  /**
   * EXISTING METHOD - Format date
   * NO CHANGES
   */
  formatDate(date: string | Date | undefined): string {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * EXISTING METHOD - Format time
   * NO CHANGES
   */
  formatTime(time: string | undefined): string {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
  }

  /**
   * EXISTING METHOD - Format relationship
   * NO CHANGES
   */
  formatRelationship(relationship: string | undefined): string {
    if (!relationship) return '';
    
    const relationshipMap: {[key: string]: string} = {
      'self': 'Self',
      'parent': 'Parent',
      'sibling': 'Sibling',
      'spouse': 'Spouse',
      'friend': 'Friend',
      'relative': 'Relative',
      'colleague': 'Colleague',
      'other': 'Other'
    };
    
    return relationshipMap[relationship] || relationship.charAt(0).toUpperCase() + relationship.slice(1);
  }
  
  /**
   * ENHANCED METHOD - Should show make payment button with installment awareness
   */
  shouldShowMakePaymentButton(): boolean {
    // Show make payment button if:
    // 1. Order is confirmed but not fully paid
    // 2. Order has partial payment but not fully paid
    // 3. There's a current installment that needs payment
    // 4. Deadline hasn't passed
    
    const isOrderConfirmed = this.order.status === 'confirmed' || this.order.paymentStatus === 'partial';
    const isNotFullyPaid = !this.paymentSummary?.isFullyPaid;
    const hasDeadlineNotPassed = !this.deadlineInfo?.isPassed;
    
    // Check if there's a current installment that can be paid
    let hasPayableInstallment = false;
    if (this.installmentOptions?.installments) {
      hasPayableInstallment = this.installmentOptions.installments.some(i => i.isClickable);
    }
    
    return isOrderConfirmed && isNotFullyPaid && hasDeadlineNotPassed && 
           (hasPayableInstallment || !this.installmentOptions?.hasInstallmentPlan);
  }
  
  /**
   * EXISTING METHOD - Should show payment history button
   * ENHANCED with installment awareness
   */
  shouldShowPaymentHistoryButton(): boolean {
    // Show payment history button if there are any payments or installments
    return (this.order.payments && this.order.payments.length > 0) || 
           (this.paymentSummary?.payments && this.paymentSummary.payments.length > 0) ||
           (this.installmentOptions?.hasInstallmentPlan);
  }

  /**
   * EXISTING METHOD - Has rejected payment
   * NO CHANGES
   */
  hasRejectedPayment(): boolean {
    return this.order.payments?.some((payment: Payment) => payment.status === 'rejected') || false;
  }

  /**
   * EXISTING METHOD - Get rejection reason
   * NO CHANGES
   */
  getRejectionReason(): string {
    const rejectedPayment = this.order.payments?.find((payment: Payment) => payment.status === 'rejected');
    return rejectedPayment?.rejectionReason || 'Payment verification failed. Please check with your bank.';
  }

  /**
   * EXISTING METHOD - Get rejected payment amount
   * NO CHANGES
   */
  getRejectedPaymentAmount(): number {
    const rejectedPayment = this.order.payments?.find((payment: Payment) => payment.status === 'rejected');
    return rejectedPayment?.amount || 0;
  }

  /**
   * EXISTING METHOD - Has rejected installment payment
   * ENHANCED with installment options check
   */
  hasRejectedInstallmentPayment(): boolean {
    // Check both order payments and installment options
    const hasRejectedInOrder = this.order.payments?.some((payment: Payment) => 
      payment.status === 'rejected' && payment.installmentNumber) || false;
    
    const hasRejectedInOptions = this.installmentOptions?.installments?.some(i => 
      i.status === 'rejected') || false;
    
    return hasRejectedInOrder || hasRejectedInOptions;
  }

  /**
   * NEW METHOD - Get installment progress information
   */
  getInstallmentProgress(): {
    completed: number,
    total: number,
    percentage: number,
    current: number
  } | null {
    if (!this.installmentOptions?.hasInstallmentPlan) {
      return null;
    }
    
    return {
      completed: this.installmentOptions.completedInstallments || 0,
      total: this.installmentOptions.totalInstallments || 0,
      percentage: this.installmentOptions.progressPercentage || 0,
      current: this.installmentOptions.currentInstallment || 1
    };
  }

  /**
   * NEW METHOD - Get deadline warning message
   */
  getDeadlineWarningMessage(): string {
    if (!this.deadlineInfo) return '';
    
    if (this.deadlineInfo.isPassed) {
      return 'Payment deadline has passed!';
    } else if (this.deadlineInfo.isUrgent) {
      const timeUntil = this.deadlineInfo.timeUntil;
      if (timeUntil.days > 0) {
        return `${timeUntil.days} day(s) ${timeUntil.hours} hour(s) until payment deadline`;
      } else {
        return `${timeUntil.hours} hour(s) ${timeUntil.minutes} minute(s) until payment deadline`;
      }
    }
    
    return '';
  }

  /**
   * NEW METHOD - Get installment plan summary text
   */
  getInstallmentPlanSummary(): string {
    if (!this.paymentSummary?.installmentPlan) return '';
    
    const plan = this.paymentSummary.installmentPlan;
    const progress = this.getInstallmentProgress();
    
    if (progress) {
      return `${plan.name} - ${progress.completed}/${progress.total} completed (${progress.percentage.toFixed(0)}%)`;
    }
    
    return plan.name;
  }
}