import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { PaymentService } from '../../../services/payment.service';
import { Order } from '../../../services/order.service';
import { Inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-payment-dialog',
  imports: [CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatRadioModule],
  templateUrl: './payment-dialog.component.html',
  styleUrl: './payment-dialog.component.css'
})
export class PaymentDialogComponent implements OnInit {
  paymentMethod: 'payhere' | 'bank-transfer' | 'online-transfer' = 'payhere';
  paymentAmount: number = 0;
  isFullPayment: boolean = true;
  selectedFile: File | null = null;
  loading: boolean = false;
  error: string | null = null;
  success: string | null = null;
  isEventWithin24Hours: boolean = false;
  fileValidationError: string | null = null;
  paymentNotes: string = ''; // Added field for payment notes
  
  constructor(
    public dialogRef: MatDialogRef<PaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public order: Order,
    private paymentService: PaymentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if event is within 24 hours
    this.checkEventTimeframe();
    
    // Set initial payment amount to full payment
    if (this.order.totalPrice) {
      this.paymentAmount = this.order.totalPrice;
    } else if (this.order.basePrice) {
      this.paymentAmount = this.order.basePrice;
    }
    
    // Force full payment if event is within 24 hours
    if (this.isEventWithin24Hours) {
      this.isFullPayment = true;
    }

    // Check for permission on init
    if (!this.authService.isLoggedIn()) {
      this.error = 'Authentication required. Please login to make payments.';
    } else if (!this.authService.isCustomer()) {
      this.error = 'You do not have permission to make payments. Please contact support.';
    }
  }

  // Check if event is within 24 hours
  checkEventTimeframe(): void {
    if (this.order?.customDetails?.eventDate) {
      const eventDate = new Date(this.order.customDetails.eventDate);
      
      // If event time is also provided, set the hours and minutes
      if (this.order.customDetails.eventTime) {
        const [hours, minutes] = this.order.customDetails.eventTime.split(':');
        eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      }
      
      const now = new Date();
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      this.isEventWithin24Hours = hoursUntilEvent < 24;
    }
  }

  onFileSelected(event: any): void {
    this.fileValidationError = null;
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.fileValidationError = 'Invalid file type. Please upload a jpg, png, or gif image.';
      event.target.value = '';
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      this.fileValidationError = 'File size exceeds 5MB limit.';
      event.target.value = '';
      return;
    }
    
    this.selectedFile = file;
  }

  onSubmit(): void {
    // Reset error and success states
    this.loading = true;
    this.error = null;
    this.success = null;
    
    // Check if the user is logged in and has the required role
    if (!this.authService.isLoggedIn()) {
      this.error = 'Authentication required. Please login to make payments.';
      this.loading = false;
      return;
    }
    
    if (!this.authService.isCustomer()) {
      this.error = 'You do not have permission to make payments. Only customers can make payments.';
      this.loading = false;
      return;
    }
    
    if (this.paymentMethod === 'payhere') {
      // Process PayHere payment
      this.processPayHerePayment();
    } else {
      // For bank or online transfers
      if (!this.selectedFile) {
        this.error = 'Please upload payment slip for bank/online transfers';
        this.loading = false;
        return;
      }
      // Process manual payment
      this.processManualPayment();
    }
  }

  processPayHerePayment(): void {
    this.paymentService.initiatePayment(this.order._id, this.paymentAmount, 'payhere')
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          // Open PayHere payment window
          if (response && response.paymentUrl) {
            window.open(response.paymentUrl, '_blank');
            this.success = 'Payment initiated. Please complete the payment in the new window.';
            
            // Close dialog after a delay
            setTimeout(() => {
              this.dialogRef.close(true);
            }, 3000);
          }
        },
        error: (error) => {
          this.error = error.message || 'Failed to initiate payment. Please try again.';
          console.error('Payment initiation error:', error);
          // If token is expired, redirect to login
          if (error.message && (error.message.includes('session expired') || error.message.includes('log in again'))) {
            setTimeout(() => {
              this.authService.logout();
            }, 2000);
          }
        }
      });
  }

  onPaymentOptionChange(): void {
    if (this.isFullPayment && this.order.totalPrice) {
      this.paymentAmount = this.order.totalPrice;
    } else {
      this.paymentAmount = this.calculateHalfPayment();
    }
  }
  
  processManualPayment(): void {
    if (!this.selectedFile) {
      this.error = 'Please upload payment slip for bank/online transfers';
      this.loading = false;
      return;
    }
    
    // Create a loading message
    this.success = 'Uploading payment slip...';
    
    // First upload the payment slip and then process the payment
    this.paymentService.uploadPaymentSlip(
      this.order._id, 
      this.selectedFile, 
      this.isFullPayment ? undefined : this.paymentAmount,
      this.paymentNotes
    )
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (response) => {
        this.success = 'Payment slip uploaded successfully. Awaiting admin verification.';
        
        setTimeout(() => {
          this.dialogRef.close(true);
        }, 2000);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Failed to upload payment slip. Please try again.';
        console.error('Upload error:', error);
        
        // If token is expired, redirect to login
        if (error.message && (error.message.includes('session expired') || error.message.includes('log in again'))) {
          setTimeout(() => {
            this.authService.logout();
          }, 2000);
        }
      }
    });
  }

  calculateHalfPayment(): number {
    if (this.order.basePrice) {
      return this.order.basePrice * 0.5;
    }
    return 0;
  }
  
  closeDialog(): void {
    this.dialogRef.close(false);
  }
}