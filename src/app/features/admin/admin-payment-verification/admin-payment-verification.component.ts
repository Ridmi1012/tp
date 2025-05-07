import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule, MatChip } from '@angular/material/chips';
import { MatTabsModule, MatTab } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { OrderService } from '../../../services/order.service';
import { PaymentService , Payment} from '../../../services/payment.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminOrderDetailsComponent } from '../admin-order-details/admin-order-details.component';



@Component({
  selector: 'app-admin-payment-verification',
  imports: [CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    DatePipe,
    MatTab,
    MatChip,
    ],
  templateUrl: './admin-payment-verification.component.html',
  styleUrl: './admin-payment-verification.component.css'
})
export class AdminPaymentVerificationComponent implements OnInit{
  pendingPayments: Payment[] = [];
  recentlyVerifiedPayments: Payment[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private orderService: OrderService,
    private paymentService: PaymentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadPayments();
  }

  loadPayments() {
    this.loading = true;
    this.error = null;
    
    // Load pending payments
    this.paymentService.getPendingPayments().subscribe({
      next: (payments) => {
        this.pendingPayments = payments;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading pending payments:', error);
        this.error = 'Failed to load pending payments. Please try again.';
        this.loading = false;
      }
    });
    
    // Load recently verified payments (last 7 days)
    this.paymentService.getRecentlyVerifiedPayments().subscribe({
      next: (payments) => {
        this.recentlyVerifiedPayments = payments;
      },
      error: (error) => {
        console.error('Error loading verified payments:', error);
      }
    });
  }
    
  viewOrderDetails(orderId: string) {
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.dialog.open(AdminOrderDetailsComponent, {
          width: '1000px',
          data: order
        });
      },
      error: (error) => {
        console.error('Error loading order details:', error);
        this.snackBar.open('Failed to load order details', 'Close', {
          duration: 3000
        });
      }
    });
  }

  viewPaymentSlip(payment: Payment) {
    window.open(payment.slipUrl, '_blank');
  }

  verifyPayment(payment: Payment) {
    this.paymentService.verifyPayment(payment.orderId.toString(), payment.id.toString()).subscribe({
      next: () => {
        this.snackBar.open('Payment verified successfully', 'Close', {
          duration: 3000,
          panelClass: 'success-snackbar'
        });
        
        // Refresh payment lists
        this.loadPayments();
      },
      error: (error) => {
        console.error('Error verifying payment:', error);
        this.snackBar.open('Failed to verify payment', 'Close', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
      }
    });
  }

  rejectPayment(payment: Payment) {
    // Open a dialog to get rejection reason
    const reason = prompt('Please enter the reason for rejecting this payment:');
    
    if (reason !== null) {
      this.paymentService.rejectPayment(payment.orderId.toString(), payment.id.toString(), reason).subscribe({
        next: () => {
          this.snackBar.open('Payment rejected', 'Close', {
            duration: 3000
          });
          
          // Refresh payment lists
          this.loadPayments();
        },
        error: (error) => {
          console.error('Error rejecting payment:', error);
          this.snackBar.open('Failed to reject payment', 'Close', {
            duration: 3000,
            panelClass: 'error-snackbar'
          });
        }
      });
    }
  }

  formatCurrency(amount: number): string {
    return `Rs. ${amount.toFixed(2)}`;
  }

  getPaymentTypeLabel(type: string): string {
    return type === 'full' ? 'Full Payment' : 'Partial Payment';
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'Date not available';
    const formattedDate = new Date(date);
    return formattedDate.toLocaleDateString() + ' ' + formattedDate.toLocaleTimeString();
  }
}
