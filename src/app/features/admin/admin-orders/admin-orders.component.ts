import { Component, OnInit } from '@angular/core';
import { OrderService } from '../../../services/order.service'; // Adjust the path as necessary
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css'
})
export class AdminOrdersComponent implements OnInit {
  orders: any[] = [];
  filteredOrders: any[] = [];
  selectedStatus: string = 'ALL';
  selectedType: string = 'ALL';
  statusOptions: string[] = ['ALL', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  typeOptions: string[] = ['ALL', 'AS_IS', 'CUSTOMIZED', 'FULLY_CUSTOM'];
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  // For detailed view
  selectedOrder: any = null;
  showOrderDetails: boolean = false;

  constructor(private orderService: OrderService) { }

  ngOnInit(): void {
    this.loadAllOrders();
  }

  loadAllOrders(): void {
    this.loading = true;
    this.orderService.getAllOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders', error);
        this.errorMessage = 'Failed to load orders. Please try again.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredOrders = this.orders.filter(order => {
      const statusMatch = this.selectedStatus === 'ALL' || order.orderStatus === this.selectedStatus;
      const typeMatch = this.selectedType === 'ALL' || order.orderType === this.selectedType;
      return statusMatch && typeMatch;
    });
  }

  updateStatus(order: any, newStatus: string): void {
    this.orderService.updateOrderStatus(order.orderId, newStatus).subscribe({
      next: (updatedOrder) => {
        // Update the order in our local array
        const index = this.orders.findIndex(o => o.orderId === order.orderId);
        if (index !== -1) {
          this.orders[index] = updatedOrder;
        }
        this.applyFilters();
        this.successMessage = `Order #${order.orderId} status updated to ${newStatus}`;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error updating order status', error);
        this.errorMessage = 'Failed to update order status. Please try again.';
      }
    });
  }

  // Fix for the 'Object is possibly 'null'' error
  onStatusChange(order: any, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateStatus(order, target.value);
  }

  viewOrderDetails(order: any): void {
    this.selectedOrder = { ...order };
    this.showOrderDetails = true;
    
    // Load additional details if needed
    this.orderService.getOrderDetails(order.orderId).subscribe({
      next: (details) => {
        this.selectedOrder = { ...details };
      },
      error: (error) => {
        console.error('Error loading order details', error);
      }
    });
  }

  closeOrderDetails(): void {
    this.showOrderDetails = false;
    this.selectedOrder = null;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}
