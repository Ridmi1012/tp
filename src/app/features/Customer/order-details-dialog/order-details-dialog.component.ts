import { Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { Inject } from '@angular/core';


@Component({
  selector: 'app-order-details-dialog',
  imports: [ CommonModule,
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule],
  templateUrl: './order-details-dialog.component.html',
  styleUrl: './order-details-dialog.component.css'
})
export class OrderDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<OrderDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public order: any
  ) {}

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
        completed: ['paid', 'in-progress', 'ready', 'delivered'].includes(this.order.status),
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
    return new Date(date).toLocaleString();
  }

}