
import { Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { OrderService, Order } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';
import { OrderDetailsDialogComponent } from '../order-details-dialog/order-details-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { PaymentDialogComponent } from '../payment-dialog/payment-dialog.component';
import { PaymentHistoryComponent } from '../payment-history/payment-history.component';
import { PaymentService} from '../../../services/payment.service';


@Component({
  selector: 'app-ongoing',
  imports: [  
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDialogModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DatePipe
  ],
  templateUrl: './ongoing.component.html',
  styleUrl: './ongoing.component.css'
})
export class OngoingComponent implements OnInit {
  ongoingOrders: Order[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private dialog: MatDialog,
    private paymentService: PaymentService // ADDED: For deadline validation
  ) {}

  ngOnInit() {
    this.loadOngoingOrders();
  }

  // EXISTING METHOD - Load ongoing orders
  // ENHANCED with better deadline checking
  loadOngoingOrders() {
    const currentUser = this.authService.getUserDetails();
    const token = this.authService.getToken();
    console.log('Current user:', currentUser);
    console.log('Auth token present:', !!token);
    
    if (currentUser?.customerId) {  // Change username to customerId
      this.orderService.getCustomerOrders(currentUser.customerId.toString()).subscribe({
        next: (orders) => {
          // ENHANCED: Check for unpaid past-due orders and cancel them
          const now = new Date();
          orders.forEach(order => {
            if (this.shouldAutoCancelOrder(order, now)) {
              this.autoCancelOrder(order);
            }
          });
          
          // Include canceled orders but exclude completed orders
          this.ongoingOrders = orders.filter(order => 
            order.status !== 'completed'
          );
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          this.error = 'Failed to load orders. Please try again.';
          this.loading = false;
        }
      });
    }
  }

  // EXISTING METHOD - Check if should show payment message
  // ENHANCED with better deadline logic
  shouldShowPaymentMessage(order: Order): boolean {
    // Only show payment message for orders that need payment
    if (order.paymentStatus === 'completed' || order.status === 'cancelled') {
      return false;
    }
    
    // ENHANCED: Check if payment deadline has passed
    if (this.isPaymentDeadlinePassed(order)) {
      return false; // Don't show payment message if deadline passed
    }
    
    return order.status === 'confirmed' || order.status === 'partial-payment';
  }

  // ENHANCED: Better logic for auto-cancellation with 24-hour deadline
  shouldAutoCancelOrder(order: Order, now: Date): boolean {
    if (!order.customDetails?.eventDate) return false;
    
    const eventDate = new Date(order.customDetails.eventDate);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setHours(deadlineDate.getHours() - 24); // CHANGED: 24-hour deadline
    
    const isDeadlinePassed = deadlineDate < now;
    const isUnpaid = order.paymentStatus === 'pending' || order.paymentStatus === 'partial';
    const isCancellable = ['confirmed', 'viewed', 'pending', 'partial-payment'].includes(order.status);
    
    return isDeadlinePassed && isUnpaid && isCancellable;
  }

  // EXISTING METHOD - Auto-cancel an order if it's past the deadline and unpaid
  // ENHANCED with better cancellation reason
  autoCancelOrder(order: Order) {
    if (order.status !== 'cancelled') {
      const reason = 'Order auto-cancelled: Payment deadline (24 hours before event) passed without full payment';
      this.orderService.cancelOrder(order.id, reason).subscribe({
        next: (updatedOrder) => {
          console.log('Order auto-cancelled:', updatedOrder);
          // Update the local order object to reflect cancellation
          order.status = 'cancelled';
          order.cancellationReason = reason;
        },
        error: (error) => {
          console.error('Failed to auto-cancel order:', error);
        }
      });
    }
  }

  // ENHANCED: Better status labels with installment information
  getStatusLabel(status: string, paymentStatus?: string): string {
    // First check if payment is completed or in a paid status
    if (paymentStatus === 'completed' || ['paid', 'in-progress', 'ready', 'delivered'].includes(status)) {
      return 'Payment Completed';
    }

    // ENHANCED: Better status labels for installment payments
    if (paymentStatus === 'partial') {
      return 'Installment Payment in Progress';
    }

    const statusLabels: { [key: string]: string } = {
      'pending': 'Order Request Sent',
      'viewed': 'Order Request Viewed',
      'confirmed': 'Order Accepted - Awaiting Payment',
      'partial-payment': 'Partial Payment Received',
      'paid': 'Payment Confirmed',
      'in-progress': 'In Progress',
      'ready': 'Ready for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    
    return statusLabels[status] || status;
  }

  // EXISTING METHOD - Get status color
  // ENHANCED with better color coding for installments
  getStatusColor(status: string, paymentStatus?: string): string {
    // If payment is completed, show success color
    if (paymentStatus === 'completed' || ['paid', 'in-progress', 'ready', 'delivered'].includes(status)) {
      return 'success';
    }

    // ENHANCED: Better color for partial payments
    if (paymentStatus === 'partial') {
      return 'accent'; // Changed from 'warn' to 'accent' for better UX
    }

    const statusColors: { [key: string]: string } = {
      'pending': 'accent',
      'viewed': 'primary',
      'confirmed': 'primary',
      'partial-payment': 'accent', // CHANGED: Better color for partial payments
      'paid': 'success',
      'in-progress': 'primary',
      'ready': 'success',
      'delivered': 'success',
      'cancelled': 'warn'
    };
    
    return statusColors[status] || 'basic';
  }

  // EXISTING METHOD - Get progress value
  // ENHANCED with better progress tracking for installments
  getProgressValue(status: string, paymentStatus?: string): number {
    // If payment is completed, show 80% progress (same as 'paid' status)
    if (paymentStatus === 'completed' && !['in-progress', 'ready', 'delivered'].includes(status)) {
      return 80;
    }

    // ENHANCED: Better progress for partial payments
    if (paymentStatus === 'partial') {
      return 60; // Show 60% for partial payments
    }

    const progressValues: { [key: string]: number } = {
      'pending': 10,
      'viewed': 20,
      'confirmed': 40,
      'partial-payment': 60,
      'paid': 80,
      'in-progress': 85,
      'ready': 95,
      'delivered': 100,
      'cancelled': 0
    };
    
    return progressValues[status] || 0;
  }

  // EXISTING METHOD - View order details
  // NO CHANGES
  viewOrderDetails(order: Order) {
    this.dialog.open(OrderDetailsDialogComponent, {
      width: '1000px',
      data: order
    });
  }

  // ENHANCED: Better payment dialog with deadline validation
  makePayment(order: Order) {
    // ENHANCED: Check if payment deadline has passed (24 hours before event)
    if (this.isPaymentDeadlinePassed(order)) {
      alert('Payment deadline has passed. Payments must be completed 24 hours before the event.');
      return;
    }
    
    // Check if order is cancelled
    if (order.status === 'cancelled') {
      alert('Cannot make payment for cancelled orders.');
      return;
    }
    
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '700px', // CHANGED: Slightly wider for better installment display
      data: order
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh orders if payment was made
        this.loadOngoingOrders();
      }
    });
  }

  // ENHANCED: Better payment messages with installment information
  getPaymentMessage(order: Order): string {
    // ENHANCED: Check if payment deadline has passed
    if (this.isPaymentDeadlinePassed(order)) {
      return 'Payment deadline has passed. Payments must be completed 24 hours before the event.';
    }
    
    const eventDate = new Date(order.customDetails.eventDate);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const daysUntilEvent = Math.floor(hoursUntilEvent / 24);
    const weeksUntilEvent = Math.floor(daysUntilEvent / 7);
    
    if (order.status === 'confirmed') {
      // ENHANCED: Better messages based on time remaining and available options
      if (daysUntilEvent < 7) {
        return 'Your event is in less than 7 days. Full payment is required to confirm your order.';
      } else if (weeksUntilEvent >= 4) {
        return 'Multiple payment options available: Full payment or installments (50%, 33.3%, or 25% splits).';
      } else if (weeksUntilEvent >= 3) {
        return 'Payment options available: Full payment or installments (50% or 33.3% splits).';
      } else if (weeksUntilEvent >= 2) {
        return 'Payment options available: Full payment or 50% installment plan.';
      } else {
        return 'Pay the full amount to confirm your order.';
      }
    } else if (order.status === 'partial-payment' || order.paymentStatus === 'partial') {
      const deadlineDate = new Date(eventDate);
      deadlineDate.setHours(deadlineDate.getHours() - 24);
      const deadlineStr = deadlineDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `Installment payment in progress. Complete all payments by ${deadlineStr}.`;
    } else if (order.status === 'payment-verification') {
      return 'Your payment slip is under verification. We will update you soon.';
    }
    return '';
  }
  
  // EXISTING METHOD - Format time in 12-hour format with AM/PM
  // NO CHANGES
  formatTime(time: string | undefined): string {
    if (!time) return '';
    
    // Convert 24-hour time format to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${hour12}:${minutes} ${ampm}`;
  }
  
  // ENHANCED: Better payment eligibility check with deadline validation
  canMakePayment(order: Order): boolean {
    // ENHANCED: Check if payment deadline has passed (24 hours before event)
    if (this.isPaymentDeadlinePassed(order)) {
      return false;
    }
    
    // Check if payment is already completed
    if (order.paymentStatus === 'completed') {
      return false;
    }
    
    return order.status === 'confirmed' || order.status === 'partial-payment' || order.paymentStatus === 'partial';
  }

  // NEW METHOD - Check if payment deadline has passed
  isPaymentDeadlinePassed(order: Order): boolean {
    if (!order.customDetails?.eventDate) return false;
    
    const eventDate = new Date(order.customDetails.eventDate);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setHours(deadlineDate.getHours() - 24); // 24-hour deadline
    
    const now = new Date();
    return now > deadlineDate;
  }

  // NEW METHOD - Get time until payment deadline
  getTimeUntilDeadline(order: Order): string {
    if (!order.customDetails?.eventDate) return 'Unknown';
    
    const eventDate = new Date(order.customDetails.eventDate);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setHours(deadlineDate.getHours() - 24);
    
    const now = new Date();
    const timeDiff = deadlineDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return 'Deadline passed';
    }
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  }

  // NEW METHOD - Get payment deadline date string
  getPaymentDeadline(order: Order): string {
    if (!order.customDetails?.eventDate) return 'Unknown';
    
    const eventDate = new Date(order.customDetails.eventDate);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setHours(deadlineDate.getHours() - 24);
    
    return deadlineDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // NEW METHOD - Get available installment plans count for display
  getAvailableInstallmentPlansCount(order: Order): number {
    if (!order.customDetails?.eventDate) return 1;
    
    const eventDate = new Date(order.customDetails.eventDate);
    const now = new Date();
    const timeDiff = eventDate.getTime() - now.getTime();
    const daysUntilEvent = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const weeksUntilEvent = Math.floor(daysUntilEvent / 7);
    
    let count = 1; // Full payment always available
    if (weeksUntilEvent >= 2) count++; // 50% split
    if (weeksUntilEvent >= 3) count++; // 33.3% split  
    if (weeksUntilEvent >= 4) count++; // 25% split
    
    return count;
  }

  // NEW METHOD - Check if order has installment payment
  hasInstallmentPayment(order: Order): boolean {
    return order.paymentStatus === 'partial' || order.status === 'partial-payment';
  }

  // NEW METHOD - Show payment history dialog
  showPaymentHistory(order: Order) {
    this.paymentService.getPaymentSummary(order.id).subscribe({
      next: (paymentSummary) => {
        const dialogRef = this.dialog.open(PaymentHistoryComponent, {
          width: '800px',
          data: {
            order: order,
            paymentSummary: paymentSummary
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result === 'make-payment') {
            this.makePayment(order);
          }
        });
      },
      error: (error) => {
        console.error('Error loading payment summary:', error);
        // Still show dialog but without payment summary
        this.dialog.open(PaymentHistoryComponent, {
          width: '800px',
          data: {
            order: order
          }
        });
      }
    });
  }

  // NEW METHOD - Get order urgency level for styling
  getOrderUrgency(order: Order): 'low' | 'medium' | 'high' | 'critical' {
    if (this.isPaymentDeadlinePassed(order)) {
      return 'critical';
    }
    
    if (!order.customDetails?.eventDate) return 'low';
    
    const eventDate = new Date(order.customDetails.eventDate);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilEvent <= 48) return 'high';    // Less than 2 days
    if (hoursUntilEvent <= 168) return 'medium'; // Less than 1 week
    return 'low';
  }

  // NEW METHOD - Format urgency message
  getUrgencyMessage(order: Order): string {
    const urgency = this.getOrderUrgency(order);
    
    switch (urgency) {
      case 'critical':
        return 'Payment deadline has passed';
      case 'high':
        return 'Urgent: Payment due within 48 hours';
      case 'medium':
        return 'Payment due within 1 week';
      default:
        return '';
    }
  }
}
