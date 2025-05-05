import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router , RouterModule} from '@angular/router';
import { OrderService, Order } from '../../../services/order.service';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { AdminConfirmDialogComponent } from '../admin-confirm-dialog/admin-confirm-dialog.component';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-admin-order-details',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './admin-order-details.component.html',
  styleUrl: './admin-order-details.component.css'
})
export class AdminOrderDetailsComponent implements OnInit{
  order: Order | null = null;
  design: any = null;
  loading = true;
  error: string | null = null;
  additionalCostsForm: FormGroup;
  statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'ready-for-delivery', label: 'Ready for Delivery' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    // Initialize form
    this.additionalCostsForm = this.fb.group({
      transportationCost: [0, [Validators.required, Validators.min(0)]],
      additionalRentalCost: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    // Check if user is admin
    if (!this.authService.isAdmin()) {
      this.snackBar.open('Unauthorized access. Please log in as admin.', 'Close', {
        duration: 3000
      });
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadOrderDetails();
  }

  loadOrderDetails(): void {
    this.loading = true;
    this.error = null;
    
    // Get the order ID from the route parameters
    const orderId = this.route.snapshot.paramMap.get('id');
    
    // Check if the URL includes the orderdetails path but with a missing or invalid ID
    if (!orderId || orderId === 'undefined' || orderId === 'null') {
      this.error = 'Order ID not found in URL. Please check the URL and try again.';
      this.loading = false;
      this.snackBar.open('Order ID not found in URL. Please check the URL and try again.', 'Close', {
        duration: 5000
      });
      return;
    }
    
    // First, verify authentication status
    if (!this.authService.getToken()) {
      this.error = 'Your session has expired. Please log in again.';
      this.loading = false;
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    
    // Fetch order details
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        if (!order) {
          this.error = 'Order not found in database';
          this.loading = false;
          return;
        }
        
        this.order = order;
        
        // Load design details if designId exists
        if (order.designId) {
          this.orderService.getDesignById(order.designId).subscribe({
            next: (design) => {
              this.design = design;
              this.loading = false; // Set loading to false after design is loaded
            },
            error: (err) => {
              console.error('Error loading design:', err);
              this.design = null;
              this.loading = false; // Important: Set loading to false even if design fails to load
            }
          });
        } else {
          this.loading = false; // IMPORTANT: Set loading to false if there's no designId
        }
      },
      error: (err) => {
        console.error('Error loading order:', err);
        this.loading = false;
        
        // Enhanced error handling
        if (err.status === 401 || err.status === 403) {
          this.error = 'You are not authorized to view this order. Your session may have expired.';
          this.snackBar.open('Authorization failed. Please log in again.', 'Login', {
            duration: 5000
          }).onAction().subscribe(() => {
            // Store current URL in query params for redirect after login
            this.router.navigate(['/login'], { 
              queryParams: { returnUrl: this.router.url } 
            });
          });
        } else if (err.status === 404) {
          this.error = 'Order ID not found';
          this.snackBar.open('Order with ID ' + orderId + ' does not exist in the database.', 'Close', {
            duration: 5000
          });
        } else {
          this.error = err.message || 'Failed to load order details. Please try again.';
          this.snackBar.open('Server error: ' + (err.error?.message || 'Unknown error'), 'Close', {
            duration: 5000
          });
        }
      }
    });
  }

  confirmOrder(): void {
    if (!this.order || !this.additionalCostsForm.valid) {
      this.snackBar.open('Please ensure all cost values are valid.', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(AdminConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Order',
        message: 'Are you sure you want to confirm this order? This will notify the customer and update the order status.',
        showInput: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const formValues = this.additionalCostsForm.value;
        this.orderService.confirmOrder(this.order!._id, {
          transportationCost: formValues.transportationCost,
          additionalRentalCost: formValues.additionalRentalCost
        }).subscribe({
          next: (updatedOrder) => {
            this.order = updatedOrder;
            this.snackBar.open('Order confirmed successfully!', 'Close', {
              duration: 3000
            });
          },
          error: (err) => {
            console.error('Error confirming order:', err);
            this.snackBar.open(err.message || 'Failed to confirm order. Please try again.', 'Close', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  cancelOrder(): void {
    if (!this.order) {
      return;
    }

    const dialogRef = this.dialog.open(AdminConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancel Order',
        message: 'Are you sure you want to cancel this order? Please provide a reason:',
        showInput: true,
        inputLabel: 'Cancellation reason',
        inputValue: ''
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.inputValue) {
        this.orderService.cancelOrder(this.order!._id, result.inputValue).subscribe({
          next: (updatedOrder) => {
            this.order = updatedOrder;
            this.snackBar.open('Order cancelled successfully!', 'Close', {
              duration: 3000
            });
          },
          error: (err) => {
            console.error('Error cancelling order:', err);
            this.snackBar.open(err.message || 'Failed to cancel order. Please try again.', 'Close', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  updateOrderStatus(status: string): void {
    if (!this.order) {
      return;
    }

    const dialogRef = this.dialog.open(AdminConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Update Order Status',
        message: `Are you sure you want to update the order status to "${this.getStatusLabel(status)}"?`,
        showInput: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.orderService.updateOrder(this.order!._id, { status }).subscribe({
          next: (updatedOrder) => {
            this.order = updatedOrder;
            this.snackBar.open('Order status updated successfully!', 'Close', {
              duration: 3000
            });
          },
          error: (err) => {
            console.error('Error updating order status:', err);
            this.snackBar.open(err.message || 'Failed to update order status. Please try again.', 'Close', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  calculateTotalPrice(): number {
    if (!this.order) {
      return 0;
    }
    
    const basePrice = this.design?.basePrice || 0;
    const transportationCost = this.additionalCostsForm.value.transportationCost || 0;
    const additionalRentalCost = this.additionalCostsForm.value.additionalRentalCost || 0;
    
    return basePrice + transportationCost + additionalRentalCost;
  }

  saveAdditionalCosts(): void {
    if (!this.order || !this.additionalCostsForm.valid) {
      this.snackBar.open('Please ensure all cost values are valid.', 'Close', { duration: 3000 });
      return;
    }
    
    const formValues = this.additionalCostsForm.value;
    this.orderService.updateOrder(this.order._id, {
      transportationCost: formValues.transportationCost,
      additionalRentalCost: formValues.additionalRentalCost
    }).subscribe({
      next: (updatedOrder) => {
        this.order = updatedOrder;
        this.snackBar.open('Additional costs updated successfully!', 'Close', {
          duration: 3000
        });
      },
      error: (err) => {
        console.error('Error updating additional costs:', err);
        this.snackBar.open(err.message || 'Failed to update additional costs. Please try again.', 'Close', {
          duration: 3000
        });
      }
    });
  }

  getPaymentStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'partial':
        return 'Partially Paid';
      case 'completed':
        return 'Paid';
      default:
        return status;
    }
  }

  formatTime(time: string | undefined): string {
    if (!time) return 'N/A';
    
    // Convert 24-hour time format to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${hour12}:${minutes} ${ampm}`;
  }

  callCustomer(): void {
    if (this.order && this.order.customerInfo?.contact) {
      const phoneNumber = this.order.customerInfo.contact;
      window.location.href = `tel:${phoneNumber}`;
    }
  }

  emailCustomer(): void {
    if (this.order && this.order.customerInfo?.email) {
      const email = this.order.customerInfo.email;
      window.location.href = `mailto:${email}`;
    }
  }

  whatsappCustomer(): void {
    if (this.order && this.order.customerInfo?.contact) {
      // Assuming Sri Lankan phone number format
      let phoneNumber = this.order.customerInfo.contact;
      
      // Ensure it has the country code for Sri Lanka (+94)
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+94' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+94' + phoneNumber;
      }
      
      const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\s+/g, '')}`;
      window.open(whatsappUrl, '_blank');
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/orders']);
  }

  printOrderDetails(): void {
    window.print();
  }

  // Helper method to get order status label
  getStatusLabel(status: string): string {
    const statusObj = this.statusOptions.find(opt => opt.value === status);
    return statusObj ? statusObj.label : status;
  }

  // Get order type display name
  getOrderTypeDisplay(type: string): string {
    switch (type) {
      case 'as-is':
        return 'Standard Order';
      case 'custom-design':
        return 'Custom Design';
      case 'custom-request':
        return 'Custom Request';
      default:
        return type || 'Unknown';
    }
  }

  // Retry loading order details
  retryLoad(): void {
    this.loadOrderDetails();
  }
}
