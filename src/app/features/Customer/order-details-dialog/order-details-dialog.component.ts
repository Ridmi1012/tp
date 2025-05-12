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
import { PaymentSummary } from '../../../services/payment.service';
import { PaymentService , Payment} from '../../../services/payment.service';




@Component({
  selector: 'app-order-details-dialog',
  imports: [CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    DatePipe],
  templateUrl: './order-details-dialog.component.html',
  styleUrl: './order-details-dialog.component.css'
})
export class OrderDetailsDialogComponent implements OnInit{
 categoryName: string = '';
  paymentSummary: PaymentSummary | null = null;
  loading: boolean = false;
  error: string | null = null;
  
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
    
    // Load payment summary from server
    this.loadPaymentSummary();
  }
  
  loadDesignDetails(): void {
    // If we don't have base price but have design ID, get the design to extract its price
    if (this.order.designId) {
      console.log('Loading design details for design ID:', this.order.designId);
      this.orderService.getDesignById(this.order.designId).subscribe({
        next: (design) => {
          if (design && design.basePrice) {
            console.log('Retrieved base price from design:', design.basePrice);
            // Update the order object with the base price from the design
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

  loadPaymentSummary(): void {
    this.loading = true;
    
    this.paymentService.getPaymentSummary(this.order._id).subscribe({
      next: (summary) => {
        this.paymentSummary = summary;
        this.loading = false;
        console.log('Payment summary loaded:', summary);
      },
      error: (error) => {
        console.error('Error loading payment summary:', error);
        // Fallback to calculating locally
        this.calculatePaymentSummary();
        this.loading = false;
      }
    });
  }


// Fix the payment calculation with proper typing
calculatePaymentSummary(): void {
  // Default values
   this.paymentSummary = {
    totalAmount: this.order.totalPrice || 0,
    totalPaid: 0,
    remainingAmount: 0,
    isFullyPaid: false,
    paymentStatus: 'pending',
    payments: []
  };
  
  // Calculate total paid from payments
  if (this.order.payments && this.order.payments.length > 0) {
    // Sum up all completed payments with proper typing
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
  
  // Calculate deadline (12 hours before event)
  if (this.order?.customDetails?.eventDate) {
    const eventDate = new Date(this.order.customDetails.eventDate);
    
    // If event time is also provided, set the hours and minutes
    if (this.order.customDetails.eventTime) {
      const [hours, minutes] = this.order.customDetails.eventTime.split(':');
      eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    }
    
    // Calculate deadline (12 hours before event)
    const deadlineDate = new Date(eventDate);
    deadlineDate.setHours(deadlineDate.getHours() - 12);
    
    this.paymentSummary.deadlineDate = deadlineDate.toISOString();
  }
  
  // Use the payments from the order
  this.paymentSummary.payments = this.order.payments || [];
}

// Fix the payment message with proper null checks
getPaymentMessage(): string {
  if (this.order.status === 'confirmed' || (this.paymentSummary && this.paymentSummary.totalPaid > 0)) {
    const eventDate = new Date(this.order.customDetails.eventDate);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // If partially paid
    if (this.paymentSummary && this.paymentSummary.totalPaid > 0 && !this.paymentSummary.isFullyPaid) {
      if (hoursUntilEvent < 24) {
        return `Remaining payment of Rs. ${this.paymentSummary.remainingAmount} must be completed immediately.`;
      } else {
        return `Remaining payment of Rs. ${this.paymentSummary.remainingAmount} must be completed before your event.`;
      }
    }
    // Not paid yet
    else if (this.paymentSummary && this.paymentSummary.totalPaid === 0) {
      if (hoursUntilEvent < 24) {
        return 'Your event is in less than 24 hours. Please pay the full amount to confirm.';
      } else {
        return 'Pay full amount or choose an installment plan to confirm your order.';
      }
    }
  }
  return '';
}

  getStatusSteps() {
    const isPartiallyPaid = this.paymentSummary?.paymentStatus === 'partial';
    const isFullyPaid = this.paymentSummary?.isFullyPaid;
    
    return [
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
      },
      { 
        label: 'Partial Payment Confirmed', 
        completed: isPartiallyPaid || this.order.paymentStatus === 'partial',
        icon: 'attach_money',
        date: isPartiallyPaid || this.order.paymentStatus === 'partial' ? this.order.updatedAt : null,
        message: isPartiallyPaid ? `Rs. ${this.paymentSummary?.totalPaid} paid. Remaining: Rs. ${this.paymentSummary?.remainingAmount}` : null
      },
      { 
        label: 'Payment Completed', 
        completed: isFullyPaid || ['paid', 'in-progress', 'ready', 'delivered'].includes(this.order.status),
        icon: 'paid',
        date: isFullyPaid ? this.order.updatedAt : null
      },
      { 
        label: 'In Progress', 
        completed: ['in-progress', 'ready', 'delivered'].includes(this.order.status),
        icon: 'engineering'
      },
      { 
        label: 'Ready for Delivery', 
        completed: ['ready', 'delivered'].includes(this.order.status),
        icon: 'local_shipping'
      },
      { 
        label: 'Delivered', 
        completed: this.order.status === 'delivered',
        icon: 'done_all'
      }
    ];
  }

  openPaymentDialog(): void {
    this.dialog.open(PaymentDialogComponent, {
      width: '600px',
      data: this.order
    }).afterClosed().subscribe(result => {
      if (result) {
        // Refresh order data if payment was successful
        this.orderService.getOrderById(this.order._id).subscribe({
          next: (updatedOrder) => {
            this.order = updatedOrder;
            // Reload payment summary with updated data
            this.loadPaymentSummary();
          },
          error: (error) => {
            console.error('Error refreshing order:', error);
          }
        });
      }
    });
  }
  
  openPaymentHistoryDialog(): void {
    this.dialog.open(PaymentHistoryComponent, {
      width: '800px',
      data: {
        order: this.order,
        paymentSummary: this.paymentSummary
      }
    });
  }
  

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

  formatTime(time: string | undefined): string {
    if (!time) return '';
    
    // Convert 24-hour time format to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${hour12}:${minutes} ${ampm}`;
  }

  formatRelationship(relationship: string | undefined): string {
    if (!relationship) return '';
    
    // Convert kebab-case or snake_case to readable text with capitalization
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
  
  shouldShowMakePaymentButton(): boolean {
    // Show make payment button if:
    // 1. Order is confirmed but not fully paid
    // 2. Order has partial payment but not fully paid
    return (
      (this.order.status === 'confirmed' || this.order.paymentStatus === 'partial') && 
      !this.paymentSummary?.isFullyPaid
    );
  }
  
  shouldShowPaymentHistoryButton(): boolean {
    // Show payment history button if there are any payments
    return (this.order.payments && this.order.payments.length > 0) || 
           (this.paymentSummary?.payments && this.paymentSummary.payments.length > 0);
  }
}