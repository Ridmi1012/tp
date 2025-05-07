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
  
  constructor(
    public dialogRef: MatDialogRef<OrderDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public order: any,
    private categoryService: CategoryService,
    private orderService: OrderService,
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

  getStatusSteps() {
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
        completed: ['partial-payment', 'paid', 'in-progress', 'ready', 'delivered'].includes(this.order.status),
        icon: 'payment',
        active: this.order.status === 'confirmed',
        message: this.getPaymentMessage()
      },
      { 
        label: 'Payment Confirmed', 
        completed: ['paid', 'in-progress', 'ready', 'delivered'].includes(this.order.status) || this.order.paymentStatus === 'completed',
        icon: 'paid',
        date: this.order.paymentStatus === 'completed' ? this.order.updatedAt : null
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
          },
          error: (error) => {
            console.error('Error refreshing order:', error);
          }
        });
      }
    });
  }
  getPaymentMessage(): string {
    if (this.order.status === 'confirmed') {
      const eventDate = new Date(this.order.customDetails.eventDate);
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
}