import { Component, OnInit } from '@angular/core';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { OrderDetailsDialogComponent } from '../../Customer/order-details-dialog/order-details-dialog.component';
import { PaymentDialogComponent } from '../../Customer/payment-dialog/payment-dialog.component';

@Component({
  selector: 'app-admin-confirmed-orders',
  imports: [CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDialogModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DatePipe],
  templateUrl: './admin-confirmed-orders.component.html',
  styleUrl: './admin-confirmed-orders.component.css'
})
export class AdminConfirmedOrdersComponent implements OnInit {
  confirmedOrders: Order[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadConfirmedOrders();
  }

  loadConfirmedOrders() {
    const currentUser = this.authService.getUserDetails();
    if (currentUser?.username) {
      this.orderService.getCustomerOrders(currentUser.username).subscribe({
        next: (orders) => {
          // Filter only active orders (confirmed through ready status)
          this.confirmedOrders = orders.filter(order => 
            ['confirmed', 'partial-payment', 'paid', 'in-progress', 'ready'].includes(order.status)
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
      'confirmed': 'Order Accepted - Awaiting Payment',
      'partial-payment': 'Partial Payment Received',
      'paid': 'Payment Confirmed',
      'in-progress': 'In Progress',
      'ready': 'Ready for Delivery'
    };
    return statusLabels[status] || status;
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'confirmed': 'primary',
      'partial-payment': 'warn',
      'paid': 'success',
      'in-progress': 'primary',
      'ready': 'success'
    };
    return statusColors[status] || 'basic';
  }

  getProgressValue(status: string): number {
    const progressValues: { [key: string]: number } = {
      'confirmed': 40,
      'partial-payment': 60,
      'paid': 80,
      'in-progress': 85,
      'ready': 95
    };
    return progressValues[status] || 0;
  }

  viewOrderDetails(order: Order) {
    this.dialog.open(OrderDetailsDialogComponent, {
      width: '1000px',
      data: order
    });
  }

  openPaymentDialog(order: Order) {
    this.dialog.open(PaymentDialogComponent, {
      width: '600px',
      data: order
    }).afterClosed().subscribe(result => {
      if (result) {
        // Refresh the orders list if payment was made
        this.loadConfirmedOrders();
      }
    });
  }

  formatTime(time: string | undefined): string {
    if (!time) return '';
    
    // Convert 24-hour time format to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${hour12}:${minutes} ${ampm}`;
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
}


