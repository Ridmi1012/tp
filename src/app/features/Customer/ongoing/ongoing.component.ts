
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


@Component({
  selector: 'app-ongoing',
  imports: [  CommonModule,
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
    if (currentUser?.username) {
      this.orderService.getCustomerOrders(currentUser.username).subscribe({
        next: (orders) => {
          // Filter only ongoing orders (not cancelled or completed)
          this.ongoingOrders = orders.filter(order => 
            order.status !== 'cancelled' && order.status !== 'completed'
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

  getStatusLabel(status: string): string {
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

  getStatusColor(status: string): string {
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

  getProgressValue(status: string): number {
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

  getPaymentMessage(order: Order): string {
    if (order.status === 'confirmed') {
      const eventDate = new Date(order.customDetails.eventDate);
      const now = new Date();
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilEvent < 24) {
        return 'Your event is in less than 24 hours. Please pay the full amount to confirm.';
      } else {
        return 'Pay full amount or 50% of the base price to confirm your order.';
      }
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
  
}
