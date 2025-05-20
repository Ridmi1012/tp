import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { OrderService, Order } from '../../../services/order.service';
import { Inject } from '@angular/core';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-single-order-details',
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatListModule,
    MatDividerModule,
    MatChipsModule,
    DatePipe
  ],
  templateUrl: './admin-single-order-details.component.html',
  styleUrl: './admin-single-order-details.component.css'
})
export class AdminSingleOrderDetailsComponent implements OnInit{
 order: Order & {
    design?: any;
    delivery?: any;
    eventDetails?: any;
    customization?: any;
    notes?: string;
    designPhotos?: string[];
    subtotal?: number;
    discountApplied?: boolean;
    discountAmount?: number;
    deliveryCharges?: number;
    items?: any[];
  };
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Order,
    private dialogRef: MatDialogRef<AdminSingleOrderDetailsComponent>,
    private authService: AuthService,
    private router: Router,
    private orderService: OrderService
  ) {
    this.order = data;
  }

  ngOnInit() {
    // Verify admin access
    const userType = this.authService.getUserType();
    if (userType !== 'ADMIN') {
      console.error('Access denied: User is not an admin');
      this.dialogRef.close();
      this.router.navigate(['/']);
      return;
    }

    // Load design details if order type is as-is or request-similar
    if (this.order.designId && (this.order.orderType === 'as-is' || this.order.orderType === 'request-similar')) {
      this.loadDesignDetails();
    }
  }

  loadDesignDetails() {
    this.orderService.getDesignById(this.order.designId).subscribe({
      next: (design) => {
        this.order.design = design;
      },
      error: (error) => {
        console.error('Error loading design details:', error);
      }
    });
  }

  getOrderTypeLabel(orderType: string): string {
    const labels: { [key: string]: string } = {
      'as-is': 'As-Is Order',
      'request-similar': 'Request Similar Order',
      'full-custom': 'Full Custom Order'
    };
    return labels[orderType] || orderType;
  }

  getOrderTypeColor(orderType: string): any {
    const colors: { [key: string]: string } = {
      'as-is': 'primary',
      'request-similar': 'accent',
      'full-custom': 'warn'
    };
    return colors[orderType] || 'basic';
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'pending': 'Pending',
      'confirmed': 'Order Confirmed',
      'partial-payment': 'Partial Payment',
      'paid': 'Paid',
      'in-progress': 'In Progress',
      'ready': 'Ready for Delivery',
      'delivered': 'Delivered',
      'completed': 'Completed'
    };
    return statusLabels[status] || status;
  }

  getPaymentStatusLabel(paymentStatus: string | undefined): string {
    if (!paymentStatus) return 'Unknown';
    
    const statusLabels: { [key: string]: string } = {
      'pending': 'Pending',
      'partial': 'Partial Payment',
      'completed': 'Completed',
      'failed': 'Failed'
    };
    return statusLabels[paymentStatus] || paymentStatus;
  }

  getCategoryName(category: any): string {
    // Handle if category is an object with name property
    if (category && typeof category === 'object' && category.name) {
      return category.name;
    }
    // Handle if category is a string
    if (typeof category === 'string') {
      return category;
    }
    // Handle if category might have other properties like title or label
    if (category && typeof category === 'object') {
      return category.title || category.label || 'N/A';
    }
    return 'N/A';
  }

  formatTime(time: string | undefined): string {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
  }

  formatCurrency(amount: number): string {
    return `Rs. ${amount.toLocaleString('en-IN')}`;
  }

  getTotalPayments(): number {
    if (!this.order.payments || this.order.payments.length === 0) return 0;
    return this.order.payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  getPaymentMethod(method: string): string {
    const methods: { [key: string]: string } = {
      'card': 'Credit/Debit Card',
      'bank-transfer': 'Bank Transfer',
      'cash': 'Cash',
      'paypal': 'PayPal',
      'payhere': 'PayHere'
    };
    return methods[method] || method;
  }

  close() {
    this.dialogRef.close();
  }
}
