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
import { MatTabsModule } from '@angular/material/tabs';
import { AdminSingleOrderDetailsComponent } from '../admin-single-order-details/admin-single-order-details.component';

@Component({
  selector: 'app-admin-confirmed-orders',
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
    MatTabsModule,
    DatePipe],
  templateUrl: './admin-confirmed-orders.component.html',
  styleUrl: './admin-confirmed-orders.component.css'
})
export class AdminConfirmedOrdersComponent implements OnInit {
  // Separate arrays for different order types
  allConfirmedOrders: Order[] = [];
  asIsOrders: Order[] = [];
  requestSimilarOrders: Order[] = [];
  customOrders: Order[] = [];
  
  loading = true;
  error: string | null = null;

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadAllConfirmedOrders();
  }

  loadAllConfirmedOrders() {
    // Verify user is admin
    const currentUser = this.authService.getUserDetails();
    const userType = this.authService.getUserType();
    
    // Fix: Check for 'ADMIN' (uppercase) instead of 'admin'
    if (userType !== 'ADMIN') {
      console.error('Access denied: User is not an admin');
      this.error = 'Access denied. Admin privileges required.';
      this.loading = false;
      return;
    }

    // Get all orders (admin endpoint)
    this.orderService.getAllOrders().subscribe({
      next: (orders) => {
        // Filter orders with completed payment status
        // Updated logic to check both order payment status and payment entity status
        this.allConfirmedOrders = orders.filter(order => {
          // Check if order payment status is completed
          if (order.paymentStatus === 'completed') {
            return true;
          }
          
          // Check if any payment has completed status
          if (order.payments && order.payments.length > 0) {
            return order.payments.some(payment => payment.status === 'completed');
          }
          
          return false;
        });
        
        // Categorize orders by type
        this.categorizeOrders(this.allConfirmedOrders);
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.error = 'Failed to load orders. Please try again.';
        this.loading = false;
      }
    });
  }

  private categorizeOrders(orders: Order[]) {
    this.asIsOrders = orders.filter(order => order.orderType === 'as-is');
    this.requestSimilarOrders = orders.filter(order => order.orderType === 'request-similar');
    this.customOrders = orders.filter(order => order.orderType === 'full-custom');
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'confirmed': 'Order Accepted - Awaiting Payment',
      'partial-payment': 'Partial Payment Received',
      'paid': 'Payment Confirmed',
      'in-progress': 'In Progress',
      'ready': 'Ready for Delivery',
      'delivered': 'Delivered',
      'completed': 'Completed'
    };
    return statusLabels[status] || status;
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'confirmed': 'primary',
      'partial-payment': 'warn',
      'paid': 'success',
      'in-progress': 'primary',
      'ready': 'success',
      'delivered': 'accent',
      'completed': 'success'
    };
    return statusColors[status] || 'basic';
  }

  getProgressValue(status: string): number {
    const progressValues: { [key: string]: number } = {
      'confirmed': 40,
      'partial-payment': 60,
      'paid': 80,
      'in-progress': 85,
      'ready': 95,
      'delivered': 98,
      'completed': 100
    };
    return progressValues[status] || 0;
  }

  viewOrderDetails(order: Order) {
    this.dialog.open(AdminSingleOrderDetailsComponent, {
      width: '1000px',
      data: order
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

  getPaymentStatusLabel(order: Order): string {
    if (order.paymentStatus === 'completed') {
      return 'Payment Completed';
    }
    
    // Check if any payment has completed status
    if (order.payments && order.payments.some(p => p.status === 'completed')) {
      return 'Payment Completed';
    }
    
    return 'Payment Status: ' + (order.paymentStatus || 'Unknown');
  }

  getOrderTypeLabel(orderType: string): string {
    const labels: { [key: string]: string } = {
      'as-is': 'As-Is Order',
      'request-similar': 'Request Similar Order',
      'full-custom': 'Full Custom Order'
    };
    return labels[orderType] || orderType;
  }
}


