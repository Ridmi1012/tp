import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-cancel',
  imports: [CommonModule],
  templateUrl: './payment-cancel.component.html',
  styleUrl: './payment-cancel.component.css'
})
export class PaymentCancelComponent implements OnInit {
  orderId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('PaymentCancelComponent initialized');
    
    // Extract the query parameters from the URL
    this.route.queryParams.subscribe(params => {
      console.log('Query parameters:', params);
      this.orderId = params['order_id'];
      
      if (!this.orderId) {
        console.warn('No order_id found in query parameters');
      } else {
        console.log(`Payment cancelled for Order ID: ${this.orderId}`);
      }
    });
  }

  navigateToOrders(): void {
    console.log('Navigating to orders page');
    this.router.navigate(['/orders/ongoing']);
  }

  retryPayment(): void {
    if (this.orderId) {
      console.log(`Navigating back to payment for Order ID: ${this.orderId}`);
      this.router.navigate(['/orders/ongoing']);
    } else {
      console.log('No order ID available, navigating to orders page');
      this.navigateToOrders();
    }
  }
}
