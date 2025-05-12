import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { catchError, finalize } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

@Component({
  selector: 'app-payment-success',
  imports: [CommonModule],
  templateUrl: './payment-success.component.html',
  styleUrl: './payment-success.component.css'
})
export class PaymentSuccessComponent implements OnInit{
  loading = true;
  paymentSuccess = false;
  errorMessage = '';
  orderDetails: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService
  ) { }

  ngOnInit(): void {
    console.log('PaymentSuccessComponent initialized');
    
    // Extract the query parameters from the URL
    this.route.queryParams.subscribe(params => {
      console.log('Query parameters:', params);
      
      const orderId = params['order_id'];
      const paymentId = params['payment_id'];
      const status = params['status_code'];

      if (!orderId || !paymentId) {
        console.error('Missing order_id or payment_id in query parameters');
        this.loading = false;
        this.paymentSuccess = false;
        this.errorMessage = 'Invalid payment information. Missing order or payment details.';
        return;
      }

      console.log(`Verifying payment - Order ID: ${orderId}, Payment ID: ${paymentId}, Status: ${status}`);

      // Status code 2 indicates successful payment
      if (status === '2') {
        this.verifyPayment(orderId, paymentId);
      } else {
        console.error(`Payment failed with status code: ${status}`);
        this.loading = false;
        this.paymentSuccess = false;
        this.errorMessage = 'Payment was not successful. Please try again or contact support.';
      }
    });
  }

  verifyPayment(orderId: string, paymentId: string): void {
    console.log(`Verifying payment for Order ID: ${orderId}, Payment ID: ${paymentId}`);
    
    this.paymentService.verifyPayHerePayment(orderId, paymentId)
      .pipe(
        catchError(error => {
          console.error('Payment verification error:', error);
          this.errorMessage = error.message || 'Failed to verify payment. Please contact support.';
          this.paymentSuccess = false;
          this.loading = false;
          return EMPTY;
        }),
        finalize(() => {
          console.log('Payment verification request completed');
          this.loading = false;
        })
      )
      .subscribe(response => {
        console.log('Payment verification successful:', response);
        this.orderDetails = response;
        this.paymentSuccess = true;
      });
  }

  navigateToOrders(): void {
    console.log('Navigating to orders page');
    this.router.navigate(['/orders/ongoing']);
  }

  navigateToOrderDetails(): void {
    if (this.orderDetails && this.orderDetails.id) {
      console.log(`Navigating to order details for Order ID: ${this.orderDetails.id}`);
      this.router.navigate(['/orders', this.orderDetails.id]);
    } else {
      console.log('No order details available, navigating to orders page');
      this.navigateToOrders();
    }
  }

}
