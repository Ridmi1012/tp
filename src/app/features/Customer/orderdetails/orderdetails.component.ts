import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderResponse, OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-orderdetails',
  imports: [CommonModule, RouterModule],
  templateUrl: './orderdetails.component.html',
  styleUrl: './orderdetails.component.css'
})
export class OrderdetailsComponent implements OnInit {
  order: OrderResponse | null = null;
  loading = true;
  error = '';
  orderId: number = 0;

  constructor(
    private orderService: OrderService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.orderId = +params['id'];
        this.loadOrderDetails();
      } else {
        this.error = 'Order ID not found';
        this.loading = false;
      }
    });
  }

  loadOrderDetails(): void {
    this.orderService.getOrderDetails(this.orderId).subscribe({
      next: (data) => {
        this.order = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading order details', err);
        this.error = 'Failed to load order details. Please try again.';
        this.loading = false;
      }
    });
  }

  goToOrders(): void {
    this.router.navigate(['/dashboard/orders']);
  }

  goToPortfolio(): void {
    this.router.navigate(['/portfolio']);
  }

}
