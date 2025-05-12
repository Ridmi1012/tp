import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { PaymentService } from '../../../services/payment.service';
import { Payment } from '../../../services/payment.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { PaymentSummary } from '../../../services/payment.service';
import { HttpParams } from '@angular/common/http';


interface Order {
  id: number;
  orderNumber: string;
  totalPrice: number;
  customDetails?: {
    eventDate?: string;
    eventTime?: string;
  };
  installmentPlanId?: number;
  installmentTotalInstallments?: number;
}


@Component({
  selector: 'app-payment-history',
  imports: [CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTableModule,
    MatChipsModule],
  templateUrl: './payment-history.component.html',
  styleUrl: './payment-history.component.css'
})
export class PaymentHistoryComponent implements OnInit {
 payments: Payment[] = [];
  paymentSummary: PaymentSummary | null = null;
  loading: boolean = true;
  error: string | null = null;
  displayedColumns: string[] = ['date', 'installment', 'amount', 'method', 'status', 'notes'];
  
  // Track payment progress
  progressPercentage: number = 0;

  constructor(
    public dialogRef: MatDialogRef<PaymentHistoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { order: Order, paymentSummary?: PaymentSummary },
    private paymentService: PaymentService,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.loadPaymentHistory();
  }

  loadPaymentHistory(): void {
    if (!this.data?.order?.id) {
      this.error = 'Order information is missing';
      this.loading = false;
      return;
    }

    // Load payments from the server - Convert id to string
    this.paymentService.getPaymentsByOrderId(this.data.order.id.toString()).subscribe({
      next: (payments) => {
        console.log(`Received ${payments.length} payments from API`);
        this.payments = payments;
        
        // If payment summary is provided in the data, use it
        if (this.data?.paymentSummary) {
          this.paymentSummary = this.data.paymentSummary;
        } else {
          // Otherwise load it from the server
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

  loadPaymentSummary(): void {
    if (!this.data?.order?.id) {
      return;
    }
    
    // Convert id to string
    this.paymentService.getPaymentSummary(this.data.order.id.toString()).subscribe({
      next: (summary) => {
        this.paymentSummary = summary;
        
        // Calculate progress percentage
        if (this.paymentSummary && this.data.order.totalPrice) {
          this.progressPercentage = (this.paymentSummary.totalPaid / this.data.order.totalPrice) * 100;
          console.log(`Payment progress: ${this.progressPercentage.toFixed(2)}%`);
        }
      },
      error: (error) => {
        console.error('Error loading payment summary:', error);
        // Fallback to calculating locally
        this.calculateLocalPaymentSummary();
      }
    });
  }

  calculateLocalPaymentSummary(): void {
    if (!this.data?.order || !this.payments.length) return;
    
    const totalAmount = this.data.order.totalPrice || 0;
    let totalPaid = 0;
    
    // Calculate total paid from completed payments
    totalPaid = this.payments
      .filter(payment => payment.status === 'completed')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const remainingAmount = Math.max(0, totalAmount - totalPaid);
    const isFullyPaid = remainingAmount === 0 && totalPaid > 0;
    
    // Calculate deadline date (12 hours before event)
    let deadlineDate: string | undefined = undefined;
    if (this.data.order?.customDetails?.eventDate) {
      const eventDate = new Date(this.data.order.customDetails.eventDate);
      
      // If event time is also provided, set the hours and minutes
      if (this.data.order.customDetails.eventTime) {
        const [hours, minutes] = this.data.order.customDetails.eventTime.split(':');
        eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      }
      
      // Calculate deadline (12 hours before event)
      const deadlineDateObj = new Date(eventDate);
      deadlineDateObj.setHours(deadlineDateObj.getHours() - 12);
      deadlineDate = deadlineDateObj.toISOString();
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
    this.progressPercentage = (totalPaid / totalAmount) * 100;
  }
  
  // Find active payment ID from the list of payments
  findActivePaymentId(): number | undefined {
    // First look for a payment with isActive flag
    const activePayment = this.payments.find(p => p.isActive === true);
    if (activePayment) {
      return activePayment.id;
    }
    
    // If none found, use the most recent payment
    const latestPayment = [...this.payments].sort((a, b) => {
      const dateA = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
      const dateB = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
      return dateB - dateA; // Sort descending (most recent first)
    })[0];
    
    return latestPayment?.id;
  }

  getStatusChipColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
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

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = new Date(date);
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn(`Invalid date format: ${date}`);
        return 'Invalid Date';
      }
      
      return this.datePipe.transform(dateObj, 'MMM d, y h:mm a') || 'N/A';
    } catch (error) {
      console.error(`Error formatting date: ${date}`, error);
      return 'Error';
    }
  }

  getPaymentMethodIcon(method: string): string {
    if (!method) return 'payments';
    
    switch (method.toLowerCase()) {
      case 'payhere':
        return 'credit_card';
      case 'bank-transfer':
        return 'account_balance';
      default:
        return 'payments';
    }
  }

  formatPaymentMethod(method: string): string {
    if (!method) return 'N/A';

    switch (method.toLowerCase()) {
      case 'payhere':
        return 'PayHere';
      case 'bank-transfer':
        return 'Bank Transfer';
      default:
        // Convert kebab-case to Title Case
        return method
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  }

  getPaymentStatusText(status: string): string {
    if (!status) return 'Unknown';

    switch (status.toLowerCase()) {
      case 'completed':
        return 'Completed';
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
  
  // Format installment number display
  formatInstallment(payment: Payment): string {
    if (!payment.installmentNumber) return 'Full Payment';
    
    // If we have installment plan info in the order
    if (this.data.order.installmentPlanId) {
      return `Installment ${payment.installmentNumber} of ${this.data.order.installmentTotalInstallments || '?'}`;
    }
    
    return `Installment ${payment.installmentNumber}`;
  }
  
  // Get time until payment deadline
  getTimeUntilDeadline(): string {
    if (!this.paymentSummary?.deadlineDate) return 'Unknown';
    
    try {
      const now = new Date();
      const deadlineDate = new Date(this.paymentSummary.deadlineDate);
      
      // Check if deadline date is valid
      if (isNaN(deadlineDate.getTime())) {
        return 'Unknown';
      }
      
      // Calculate days until deadline
      const daysUntilDeadline = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDeadline < 0) {
        return 'Deadline has passed';
      } else if (daysUntilDeadline === 0) {
        // Calculate hours
        const hoursUntilDeadline = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        if (hoursUntilDeadline <= 0) {
          return 'Less than an hour';
        }
        return `${hoursUntilDeadline} hour${hoursUntilDeadline !== 1 ? 's' : ''}`;
      } else if (daysUntilDeadline === 1) {
        return '1 day';
      } else {
        return `${daysUntilDeadline} days`;
      }
    } catch (error) {
      console.error(`Error calculating time until deadline: ${this.paymentSummary.deadlineDate}`, error);
      return 'Unknown';
    }
  }
  
  // Check if a payment is the active payment
  isActivePayment(payment: Payment): boolean {
    if (payment.isActive === true) {
      return true;
    }
    
    if (this.paymentSummary?.activePaymentId) {
      return payment.id === this.paymentSummary.activePaymentId;
    }
    
    return false;
  }
}
