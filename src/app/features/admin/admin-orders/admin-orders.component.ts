import { Component, OnDestroy, OnInit } from '@angular/core';
import { OrderService } from '../../../services/order.service'; 
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Order } from '../../../services/order.service'; 
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import { Subscription } from 'rxjs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-orders',
  imports: [CommonModule, 
    FormsModule, 
    MatTabsModule, 
    RouterModule, 
    MatBadgeModule, 
    MatIconModule, 
    MatMenuModule, 
    MatButtonModule,
    MatSnackBarModule],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css'
})
export class AdminOrdersComponent implements OnInit, OnDestroy {
  newOrders: Order[] = [];
  ongoingOrders: Order[] = [];
  completedOrders: Order[] = [];
  cancelledOrders: Order[] = [];
  loading = true;
  error: string | null = null;
  
  // Notification related properties
  unreadNotificationsCount = 0;
  notificationsList: any[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private orderService: OrderService,
    private snackBar: MatSnackBar,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    
    // Set up polling for new orders (every 30 seconds)
    const orderPolling = setInterval(() => {
      this.checkForNewOrders();
    }, 30000);
    
    // Subscribe to notification updates
    this.subscriptions.push(
      this.notificationService.unreadCount.subscribe(count => {
        this.unreadNotificationsCount = count;
      })
    );
    
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notificationsList = notifications;
      })
    );
    
    // Subscribe to notification updates
    this.subscriptions.push(
      this.notificationService.notificationUpdates.subscribe(notification => {
        if (notification.data && notification.data.type === 'new-order') {
          // Refresh orders when new order notification is received
          this.loadOrders();
        }
      })
    );
    
    // Store interval for cleanup
    this.subscriptions.push({
      unsubscribe: () => clearInterval(orderPolling)
    } as Subscription);
    
    // Request notification permission if supported
    if (this.notificationService.isPushNotificationSupported()) {
      this.notificationService.requestSubscription().subscribe();
    }
  }
  
  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadOrders(): void {
    this.loading = true;
    
    // Load all orders and categorize them
    this.orderService.getAllOrders().subscribe({
      next: (orders) => {
        // Reset arrays
        this.newOrders = [];
        this.ongoingOrders = [];
        this.completedOrders = [];
        this.cancelledOrders = [];
        
        // Categorize orders
        orders.forEach(order => {
          switch (order.status) {
            case 'pending':
              this.newOrders.push(order);
              break;
            case 'confirmed':
            case 'in-progress':
            case 'ready-for-delivery':
              this.ongoingOrders.push(order);
              break;
            case 'completed':
              this.completedOrders.push(order);
              break;
            case 'cancelled':
              this.cancelledOrders.push(order);
              break;
          }
        });
        
        // Sort orders by date (newest first)
        this.newOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.ongoingOrders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        this.completedOrders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        this.cancelledOrders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.error = 'Failed to load orders. Please try again.';
        this.loading = false;
      }
    });
  }

 // Modify checkForNewOrders in admin-orders.component.ts:
checkForNewOrders(): void {
  // Keep track of already processed order IDs to prevent duplicates
  const processedOrderIds = new Set(this.newOrders.map(order => order._id));
  
  this.orderService.getNewOrders().subscribe({
    next: (orders) => {
      // Only consider truly new orders not already in our list
      const newOrders = orders.filter(order => !processedOrderIds.has(order._id));
      
      if (newOrders.length > 0) {
        // Show a single notification for all new orders
        this.showNewOrderNotification(newOrders.length);
        
        // Trigger notifications only for actual new orders
        newOrders.forEach(order => {
          this.notificationService.triggerOrderNotification(order);
        });
        
        // Update the orders list
        this.loadOrders();
      }
    },
    error: (err) => {
      console.error('Error checking for new orders:', err);
    }
  });
}

  showNewOrderNotification(count: number): void {
    this.snackBar.open(
      `You have ${count} new order${count > 1 ? 's' : ''}!`, 
      'View', 
      {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
      }
    ).onAction().subscribe(() => {
      // Scroll to the new orders section
      document.getElementById('new-orders-tab')?.click();
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

  // Helper method to get order type display name
  getOrderTypeDisplay(type: string): string {
    switch (type) {
      case 'as-is':
        return 'Standard Order';
      case 'custom-design':
        return 'Custom Design';
      case 'custom-request':
        return 'Custom Request';
      default:
        return type;
    }
  }
  
  // Mark notification as read
  markNotificationAsRead(notification: any, event: Event): void {
    event.stopPropagation();
    if (notification.data && notification.data.orderId) {
      this.notificationService.markNotificationAsRead(notification.data.orderId).subscribe();
    }
  }
  
  // Mark all notifications as read
  markAllNotificationsAsRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllNotificationsAsRead().subscribe();
  }
  
  // Navigate to order from notification
  navigateToOrder(notification: any, event: Event): void {
    event.stopPropagation();
    if (notification.data && notification.data.orderId) {
      // Mark as read and navigate
      this.notificationService.markNotificationAsRead(notification.data.orderId).subscribe();
      window.location.href = `/admin/orders/${notification.data.orderId}`;
    }
  }
}
