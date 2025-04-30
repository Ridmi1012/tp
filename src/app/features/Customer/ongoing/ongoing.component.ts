import { CommonModule } from '@angular/common';
import { Component , OnInit} from '@angular/core';
import { RouterModule } from '@angular/router';
import { OrderService, OrderResponse } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-ongoing',
  imports: [CommonModule, RouterModule],
  templateUrl: './ongoing.component.html',
  styleUrl: './ongoing.component.css'
})
export class OngoingComponent implements OnInit{
  orders: OrderResponse[] = [];
  loading = true;
  error = '';
  customerId = 0;

  constructor(
    private orderService: OrderService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (user && user.customerId) {
          this.customerId = user.customerId;
          this.loadOrders();
        } else {
          this.error = 'You need to login to view your orders';
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Error getting current user', err);
        this.error = 'Unable to authenticate. Please login again.';
        this.loading = false;
      }
    });
  }

  loadOrders(): void {
    this.orderService.getCustomerOrders(this.customerId).subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading orders', err);
        this.error = 'Failed to load orders. Please try again.';
        this.loading = false;
      }
    });
  }
}
