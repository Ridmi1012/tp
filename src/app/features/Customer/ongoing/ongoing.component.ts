
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


@Component({
  selector: 'app-ongoing',
  imports: [   CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDialogModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DatePipe],
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
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadOngoingOrders();
  }

  loadOngoingOrders() {
    const currentUser = this.authService.getUserDetails();
    const token = this.authService.getToken();
    console.log('Current user:', currentUser);
    console.log('Auth token present:', !!token);
    
    if (currentUser?.customerId) {  // Change username to customerId
      this.orderService.getCustomerOrders(currentUser.customerId.toString()).subscribe({
        next: (orders) => {
          // Check for unpaid past-due orders and cancel them
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

  shouldShowPaymentMessage(order: Order): boolean {
  // Only show payment message for orders that need payment
  if (order.paymentStatus === 'completed' || order.status === 'cancelled') {
    return false;
  }
  
  return order.status === 'confirmed' || order.status === 'partial-payment';
}


  // Helper method to check if order should be auto-cancelled
  shouldAutoCancelOrder(order: Order, now: Date): boolean {
    const eventDate = new Date(order.customDetails.eventDate);
    const isPastEvent = eventDate < now;
    const isUnpaid = order.paymentStatus === 'pending' || order.paymentStatus === 'partial';
    const isCancellable = ['confirmed', 'viewed', 'pending', 'partial-payment'].includes(order.status);
    
    return isPastEvent && isUnpaid && isCancellable;
  }

  // Auto-cancel an order if it's past the event date and unpaid
  autoCancelOrder(order: Order) {
    if (order.status !== 'cancelled') {
      this.orderService.cancelOrder(order.id, 'Order auto-cancelled: Event date passed without full payment').subscribe({
        next: (updatedOrder) => {
          console.log('Order auto-cancelled:', updatedOrder);
          // Update the local order object to reflect cancellation
          order.status = 'cancelled';
          order.cancellationReason = 'Event date passed without full payment';
        },
        error: (error) => {
          console.error('Failed to auto-cancel order:', error);
        }
      });
    }
  }

getStatusLabel(status: string, paymentStatus?: string): string {
  // First check if payment is completed or in a paid status
  if (paymentStatus === 'completed' || ['paid', 'in-progress', 'ready', 'delivered'].includes(status)) {
    return 'Payment Completed';
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

  getStatusColor(status: string, paymentStatus?: string): string {
  // If payment is completed, show success color
  if (paymentStatus === 'completed' || ['paid', 'in-progress', 'ready', 'delivered'].includes(status)) {
    return 'success';
  }

  const statusColors: { [key: string]: string } = {
    'pending': 'accent',
    'viewed': 'primary',
    'confirmed': 'primary',
    'partial-payment': 'warn',
    'paid': 'success',
    'in-progress': 'primary',
    'ready': 'success',
    'delivered': 'success',
    'cancelled': 'warn'
  };
  
  return statusColors[status] || 'basic';
}

 getProgressValue(status: string, paymentStatus?: string): number {
  // If payment is completed, show 80% progress (same as 'paid' status)
  if (paymentStatus === 'completed' && !['in-progress', 'ready', 'delivered'].includes(status)) {
    return 80;
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

  viewOrderDetails(order: Order) {
    this.dialog.open(OrderDetailsDialogComponent, {
      width: '1000px',
      data: order
    });
  }

  makePayment(order: Order) {
    // Check if order is cancelled or event date has passed
    const now = new Date();
    const eventDate = new Date(order.customDetails.eventDate);
    
    if (order.status === 'cancelled') {
      alert('Cannot make payment for cancelled orders.');
      return;
    }
    
    if (eventDate < now) {
      alert('Cannot make payment as the event date has already passed.');
      return;
    }
    
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '600px',
      data: order
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh orders if payment was made
        this.loadOngoingOrders();
      }
    });
  }

  getPaymentMessage(order: Order): string {
    // Check if event date has passed
    const eventDate = new Date(order.customDetails.eventDate);
    const now = new Date();
    
    if (eventDate < now) {
      return 'The event date has passed. Payment is no longer accepted.';
    }
    
    if (order.status === 'confirmed') {
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilEvent < 24) {
        return 'Your event is in less than 24 hours. Please pay the full amount to confirm.';
      } else {
        return 'Pay full amount or 50% of the base price to confirm your order.';
      }
    } else if (order.status === 'partial-payment') {
      return 'Your partial payment has been received. Please pay the remaining amount before your event.';
    } else if (order.status === 'payment-verification') {
      return 'Your payment slip is under verification. We will update you soon.';
    }
    return '';
  }
  
  // New method to format time in 12-hour format with AM/PM
  formatTime(time: string | undefined): string {
    if (!time) return '';
    
    // Convert 24-hour time format to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${hour12}:${minutes} ${ampm}`;
  }
  
  canMakePayment(order: Order): boolean {
  // Check if event date has passed
  const eventDate = new Date(order.customDetails.eventDate);
  const now = new Date();
  
  if (eventDate < now) {
    return false; // Cannot make payment if event date has passed
  }
  
  // Check if payment is already completed
  if (order.paymentStatus === 'completed') {
    return false;
  }
  
  return order.status === 'confirmed' || order.status === 'partial-payment';
}
}
