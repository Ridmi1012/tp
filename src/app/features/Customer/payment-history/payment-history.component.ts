import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { Payment } from '../../../services/payment.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { PaymentService, PaymentSummary } from '../../../services/payment.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';  
import { MatTooltipModule } from '@angular/material/tooltip';  



interface Order {
  id: string; 
  orderNumber: string;
  totalPrice: number;
  customDetails?: {
    eventDate?: string;
    eventTime?: string;
  };
  installmentPlanId?: number;
  installmentTotalInstallments?: number;
}

interface DialogData {
  order: Order;
  paymentSummary?: PaymentSummary;
}


@Component({
  selector: 'app-payment-history',
  imports: [
     CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTableModule,
    MatChipsModule,
    MatProgressBarModule,  // ADDED
    MatTooltipModule       
  ],
  templateUrl: './payment-history.component.html',
  styleUrl: './payment-history.component.css'
})
export class PaymentHistoryComponent implements OnInit {
 payments: Payment[] = [];
  paymentSummary: PaymentSummary | null = null;
  loading: boolean = true;
  error: string | null = null;
  displayedColumns: string[] = ['date', 'installment', 'amount', 'method', 'status', 'notes'];
  
  // Enhanced progress tracking
  progressPercentage: number = 0;
  isDeadlinePassed: boolean = false; 
  hoursUntilDeadline: number = 0;   

  constructor(
    public dialogRef: MatDialogRef<PaymentHistoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private paymentService: PaymentService,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.loadPaymentHistory();
  }

  // Type guard to check if order data is valid
  private isValidOrderData(): boolean {
    return !!(this.data?.order?.id);
  }

  // Safe date creation with validation
  private createSafeDate(dateValue: string | Date | undefined | null): Date | null {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  // Enhanced method with proper error handling
  loadPaymentHistory(): void {
    if (!this.isValidOrderData()) {
      this.error = 'Order information is missing';
      this.loading = false;
      return;
    }

    const orderId = this.data.order.id;
    
    this.paymentService.getPaymentsByOrderId(orderId).subscribe({
      next: (payments) => {
        console.log(`Received ${payments.length} payments from API`);
        this.payments = payments || [];
        
        if (this.data?.paymentSummary) {
          this.paymentSummary = this.data.paymentSummary;
          this.calculateDeadlineStatus();
        } else {
          this.loadPaymentSummary();
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading payment history:', error);
        this.error = 'Failed to load payment history. Please try again.';
        this.loading = false;
      }
    });
  }

  // Enhanced with proper null checking
  loadPaymentSummary(): void {
    if (!this.isValidOrderData()) {
      return;
    }
    
    const orderId = this.data.order.id;
    
    this.paymentService.getPaymentSummary(orderId).subscribe({
      next: (summary) => {
        this.paymentSummary = summary;
        
        // Calculate progress percentage with safe access
        if (this.paymentSummary?.totalPaid != null && this.data.order?.totalPrice) {
          this.progressPercentage = (this.paymentSummary.totalPaid / this.data.order.totalPrice) * 100;
          console.log(`Payment progress: ${this.progressPercentage.toFixed(2)}%`);
        }

        this.calculateDeadlineStatus();
      },
      error: (error) => {
        console.error('Error loading payment summary:', error);
        this.calculateLocalPaymentSummary();
      }
    });
  }

  // Fixed with proper null checking and type safety
  calculateDeadlineStatus(): void {
    // Reset defaults
    this.isDeadlinePassed = false;
    this.hoursUntilDeadline = 0;

    let deadlineDate: Date | null = null;

    // Try to get deadline from payment summary first
    if (this.paymentSummary?.deadlineDate) {
      deadlineDate = this.createSafeDate(this.paymentSummary.deadlineDate);
    }
    
    // Fallback to calculating from event date
    if (!deadlineDate && this.data?.order?.customDetails?.eventDate) {
      const eventDate = this.createSafeDate(this.data.order.customDetails.eventDate);
      if (eventDate) {
        // Create deadline 24 hours before event
        deadlineDate = new Date(eventDate.getTime() - (24 * 60 * 60 * 1000));
      }
    }

    if (!deadlineDate) {
      return; // No valid deadline date found
    }

    const now = new Date();
    const timeDiff = deadlineDate.getTime() - now.getTime();
    
    this.isDeadlinePassed = timeDiff <= 0;
    this.hoursUntilDeadline = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60)));
  }

  // Enhanced with better error handling and type safety
  calculateLocalPaymentSummary(): void {
    if (!this.data?.order || !Array.isArray(this.payments)) {
      return;
    }
    
    const totalAmount = this.data.order.totalPrice || 0;
    
    // Calculate total paid from completed payments with null safety
    const totalPaid = this.payments
      .filter(payment => payment?.status === 'completed' || payment?.status === 'confirmed')
      .reduce((sum, payment) => sum + (payment?.amount || 0), 0);
    
    const remainingAmount = Math.max(0, totalAmount - totalPaid);
    const isFullyPaid = remainingAmount === 0 && totalPaid > 0;
    
    // Enhanced deadline calculation with proper type checking
    let deadlineDate: string | undefined = undefined;
    
    const eventDateStr = this.data.order?.customDetails?.eventDate;
    if (eventDateStr) {
      const eventDate = this.createSafeDate(eventDateStr);
      
      if (eventDate) {
        // Set event time if provided
        const eventTime = this.data.order.customDetails?.eventTime;
        if (eventTime && typeof eventTime === 'string') {
          const timeParts = eventTime.split(':');
          if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            
            if (!isNaN(hours) && !isNaN(minutes)) {
              eventDate.setHours(hours, minutes, 0, 0);
            }
          }
        }
        
        // Calculate deadline (24 hours before event)
        const deadlineDateObj = new Date(eventDate.getTime() - (24 * 60 * 60 * 1000));
        deadlineDate = deadlineDateObj.toISOString();
      }
    }
    
    // Create local payment summary
    this.paymentSummary = {
      totalAmount,
      totalPaid,
      remainingAmount,
      isFullyPaid,
      paymentStatus: isFullyPaid ? 'completed' : (totalPaid > 0 ? 'partial' : 'pending'),
      deadlineDate,
      payments: this.payments,
      activePaymentId: this.findActivePaymentId()
    };
    
    // Calculate progress percentage
    if (totalAmount > 0) {
      this.progressPercentage = (totalPaid / totalAmount) * 100;
    }

    this.calculateDeadlineStatus();
  }
  
  // Enhanced with null safety
  findActivePaymentId(): number | undefined {
    if (!Array.isArray(this.payments) || this.payments.length === 0) {
      return undefined;
    }

    // Look for payment with isActive flag
    const activePayment = this.payments.find(p => p?.isActive === true);
    if (activePayment?.id != null) {
      return activePayment.id;
    }
    
    // Find most recent payment
    const sortedPayments = [...this.payments]
      .filter(p => p?.submittedDate) // Only include payments with dates
      .sort((a, b) => {
        const dateA = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
        const dateB = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
        return dateB - dateA;
      });
    
    return sortedPayments[0]?.id;
  }

  // Type-safe status chip color
  getStatusChipColor(status: string | undefined): string {
    if (!status) return 'default';
    
    switch (status.toLowerCase()) {
      case 'completed':
      case 'confirmed':
      case 'verified':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'rejected':
        return 'warn';
      default:
        return 'default';
    }
  }

  // Enhanced date formatting with better error handling
  formatDate(date: string | Date | undefined | null): string {
    if (!date) return 'N/A';
    
    const safeDate = this.createSafeDate(date);
    if (!safeDate) {
      console.warn(`Invalid date format: ${date}`);
      return 'Invalid Date';
    }
    
    try {
      return this.datePipe.transform(safeDate, 'MMM d, y h:mm a') || 'N/A';
    } catch (error) {
      console.error(`Error formatting date: ${date}`, error);
      return 'Error';
    }
  }

  // Type-safe payment method icon
  getPaymentMethodIcon(method: string | undefined): string {
    if (!method || typeof method !== 'string') return 'payments';
    
    switch (method.toLowerCase()) {
      case 'payhere':
        return 'credit_card';
      case 'bank-transfer':
        return 'account_balance';
      default:
        return 'payments';
    }
  }

  // Enhanced payment method formatting
  formatPaymentMethod(method: string | undefined): string {
    if (!method || typeof method !== 'string') return 'N/A';

    switch (method.toLowerCase()) {
      case 'payhere':
        return 'PayHere';
      case 'bank-transfer':
        return 'Bank Transfer';
      default:
        return method
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  }

  // Type-safe status text
  getPaymentStatusText(status: string | undefined): string {
    if (!status || typeof status !== 'string') return 'Unknown';

    switch (status.toLowerCase()) {
      case 'completed':
        return 'Completed';
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending Verification';
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
  
  // Enhanced installment formatting with null safety
  formatInstallment(payment: Payment): string {
    if (!payment?.installmentNumber) return 'Full Payment';
    
    // Check payment summary installment plan
    if (this.paymentSummary?.installmentPlan?.numberOfInstallments) {
      return `Installment ${payment.installmentNumber} of ${this.paymentSummary.installmentPlan.numberOfInstallments}`;
    }
    
    // Check order installment info
    if (this.data?.order?.installmentPlanId && this.data.order.installmentTotalInstallments) {
      return `Installment ${payment.installmentNumber} of ${this.data.order.installmentTotalInstallments}`;
    }
    
    // Handle full payment case
    if (payment.paymentType === 'full' && payment.installmentNumber === 1) {
      return 'Full Payment';
    }
    
    return `Installment ${payment.installmentNumber}`;
  }
  
  // Enhanced active payment check
  isActivePayment(payment: Payment): boolean {
    if (!payment) return false;
    
    if (payment.isActive === true) {
      return true;
    }
    
    if (this.paymentSummary?.activePaymentId != null && payment.id != null) {
      return payment.id === this.paymentSummary.activePaymentId;
    }
    
    return false;
  }

  // Fixed deadline calculation with proper type safety
  getTimeUntilDeadline(): string {
    let deadline: Date | null = null;
    
    // Try payment summary deadline first
    if (this.paymentSummary?.deadlineDate) {
      deadline = this.createSafeDate(this.paymentSummary.deadlineDate);
    }
    
    // Fallback to event date calculation
    if (!deadline && this.data?.order?.customDetails?.eventDate) {
      const eventDate = this.createSafeDate(this.data.order.customDetails.eventDate);
      if (eventDate) {
        deadline = new Date(eventDate.getTime() - (24 * 60 * 60 * 1000));
      }
    }

    if (!deadline) {
      return 'N/A';
    }

    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'Overdue';
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  }

  // Enhanced with null safety
  getCompletedInstallments(): number {
    if (!this.paymentSummary?.installmentPlan || !Array.isArray(this.payments)) {
      return 0;
    }

    return this.payments.filter(payment => 
      payment?.installmentNumber != null && 
      (payment.status === 'completed' || payment.status === 'confirmed')
    ).length;
  }

  // Type-safe installment status check
  isInstallmentPaid(installmentNumber: number): boolean {
    if (!Array.isArray(this.payments)) return false;
    
    return this.payments.some(payment => 
      payment?.installmentNumber === installmentNumber && 
      (payment.status === 'completed' || payment.status === 'confirmed')
    );
  }

  // Enhanced installment pending check
  isInstallmentPending(installmentNumber: number): boolean {
    if (!Array.isArray(this.payments)) return false;
    
    const payment = this.payments.find(p => p?.installmentNumber === installmentNumber);
    if (!payment) {
      return installmentNumber > (this.paymentSummary?.currentInstallment || 1);
    }
    return payment.status === 'pending';
  }

  // Enhanced status with null safety
  getCurrentInstallmentStatus(): string {
    if (!this.paymentSummary) {
      return 'Unknown';
    }

    if (this.paymentSummary.isFullyPaid) {
      return 'All installments completed';
    }

    const currentInstallment = this.paymentSummary.currentInstallment || 1;
    const currentPayment = Array.isArray(this.payments) ? 
      this.payments.find(p => p?.installmentNumber === currentInstallment) : null;

    if (currentPayment?.status) {
      switch (currentPayment.status) {
        case 'completed':
        case 'confirmed':
          return `Installment ${currentInstallment} paid`;
        case 'pending':
          return `Installment ${currentInstallment} awaiting verification`;
        case 'rejected':
          return `Installment ${currentInstallment} was rejected`;
        default:
          return `Installment ${currentInstallment} in progress`;
      }
    } else {
      return `Awaiting installment ${currentInstallment} payment`;
    }
  }

  // Enhanced deadline progress calculation
  getDeadlineProgress(): number {
    if (this.isDeadlinePassed) return 100;
    if (this.hoursUntilDeadline <= 0) return 100;
    
    const maxHours = 168; // 7 days
    const progress = Math.max(0, Math.min(100, ((maxHours - this.hoursUntilDeadline) / maxHours) * 100));
    return progress;
  }

  // Type-safe deadline color
  getDeadlineColor(): 'primary' | 'accent' | 'warn' {
    if (this.isDeadlinePassed) return 'warn';
    if (this.hoursUntilDeadline <= 24) return 'warn';
    if (this.hoursUntilDeadline <= 72) return 'accent';
    return 'primary';
  }

  // Enhanced installment progress
  getInstallmentProgress(): number {
    if (!this.paymentSummary?.installmentPlan?.numberOfInstallments) return 0;
    
    const completed = this.getCompletedInstallments();
    const total = this.paymentSummary.installmentPlan.numberOfInstallments;
    
    return total > 0 ? (completed / total) * 100 : 0;
  }

  // Safe installment plan description
  getInstallmentPlanDescription(): string {
    const plan = this.paymentSummary?.installmentPlan;
    if (!plan?.name || !Array.isArray(plan.percentages)) return '';
    
    const percentagesStr = plan.percentages.join('%, ') + '%';
    return `${plan.name} (${percentagesStr})`;
  }

  // Enhanced payment method statistics
  getPaymentMethodStats(): { payhere: number, bankTransfer: number } {
    const stats = { payhere: 0, bankTransfer: 0 };
    
    if (!Array.isArray(this.payments)) return stats;
    
    this.payments.forEach(payment => {
      if (payment?.method === 'payhere') {
        stats.payhere++;
      } else if (payment?.method === 'bank-transfer') {
        stats.bankTransfer++;
      }
    });
    
    return stats;
  }

  // Enhanced payment capability check
  canMakeNextPayment(): boolean {
    if (!this.paymentSummary || this.paymentSummary.isFullyPaid) {
      return false;
    }
    
    if (this.isDeadlinePassed) {
      return false;
    }
    
    // Check for pending payments
    const hasPendingPayment = Array.isArray(this.payments) && 
      this.payments.some(p => p?.status === 'pending');
    
    return !hasPendingPayment;
  }

  // Enhanced next payment amount calculation
  getNextPaymentAmount(): number {
    if (!this.paymentSummary) return 0;
    
    const plan = this.paymentSummary.installmentPlan;
    const currentInstallment = this.paymentSummary.currentInstallment;
    
    if (!plan || !currentInstallment) {
      return this.paymentSummary.remainingAmount || 0;
    }
    
    if (currentInstallment > plan.numberOfInstallments) {
      return 0;
    }
    
    const percentageIndex = currentInstallment - 1;
    if (Array.isArray(plan.percentages) && 
        percentageIndex < plan.percentages.length &&
        this.paymentSummary.totalAmount) {
      const percentage = plan.percentages[percentageIndex];
      return (percentage / 100) * this.paymentSummary.totalAmount;
    }
    
    return 0;
  }
}
