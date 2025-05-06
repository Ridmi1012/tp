import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router , RouterModule} from '@angular/router';
import { OrderService, Order } from '../../../services/order.service';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { AdminConfirmDialogComponent } from '../admin-confirm-dialog/admin-confirm-dialog.component';
import { AuthService } from '../../../services/auth.service';
import { TemplateRef, ViewChild } from '@angular/core';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-admin-order-details',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, FormsModule],
  templateUrl: './admin-order-details.component.html',
  styleUrl: './admin-order-details.component.css'
})
export class AdminOrderDetailsComponent implements OnInit{
   // View template references for dialogs
   @ViewChild('pricingDialogTemplate') pricingDialogTemplate!: TemplateRef<any>;
   @ViewChild('fullImageTemplate') fullImageTemplate!: TemplateRef<any>;
   @ViewChild('cancelDialogTemplate') cancelDialogTemplate!: TemplateRef<any>;
   
   // Properties
   order: Order | null = null;
   design: any = null;
   loading = true;
   error: string | null = null;
   additionalCostsForm: FormGroup;
   currentFullImage: string = '';
   cancellationReason: string = '';
   confirmFromPricing: boolean = false;
   
   // Dialog references
   pricingDialogRef: MatDialogRef<any> | null = null;
   fullImageDialogRef: MatDialogRef<any> | null = null;
   cancelDialogRef: MatDialogRef<any> | null = null;
   
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
     private dialog: MatDialog,
     private notificationService: NotificationService
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
     
     // Check for authentication token
     if (!this.authService.getToken()) {
       this.error = 'Your session has expired. Please log in again.';
       this.loading = false;
       this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
       return;
     }
     
     // Log debug info
     console.log('Loading order details for ID:', orderId);
     console.log('Auth token present:', !!this.authService.getToken());
     console.log('User is admin:', this.authService.isAdmin());
     
     // Fetch order details
     this.orderService.getOrderById(orderId).subscribe({
       next: (order) => {
         if (!order) {
           this.error = 'Order not found in database';
           this.loading = false;
           return;
         }
         
         this.order = order;
         console.log('Order loaded successfully:', order);
         
         // Load design details if designId exists
         if (order.designId) {
           this.orderService.getDesignById(order.designId).subscribe({
             next: (design) => {
               this.design = design;
               this.loading = false;
               console.log('Design loaded successfully:', design);
               
               // Update form with existing values
               this.updateFormWithOrderData(order);
             },
             error: (err) => {
               console.error('Error loading design:', err);
               this.design = null;
               this.loading = false;
               // Show a warning but don't block the user
               this.snackBar.open('Could not load design details, but order information is available.', 'Close', {
                 duration: 3000
               });
               
               // Still update the form with available order data
               this.updateFormWithOrderData(order);
             }
           });
         } else {
           this.loading = false;
           // Update form with existing values even if there's no design
           this.updateFormWithOrderData(order);
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
 
   // Helper method to update form with order data
   private updateFormWithOrderData(order: Order): void {
     // Update form with existing values
     if (order.transportationCost !== undefined) {
       this.additionalCostsForm.patchValue({
         transportationCost: order.transportationCost
       });
     }
     
     if (order.additionalRentalCost !== undefined) {
       this.additionalCostsForm.patchValue({
         additionalRentalCost: order.additionalRentalCost
       });
     }
   }
 
   // Dialog management methods
   openPricingDialog(confirmAfter: boolean = false): void {
     this.confirmFromPricing = confirmAfter;
     this.pricingDialogRef = this.dialog.open(this.pricingDialogTemplate, {
       width: '500px',
       disableClose: true
     });
   }
 
   closePricingDialog(): void {
     if (this.pricingDialogRef) {
       this.pricingDialogRef.close();
       this.pricingDialogRef = null;
     }
     this.confirmFromPricing = false;
   }
 
   savePricingAndClose(): void {
     if (!this.order || !this.additionalCostsForm.valid) {
       this.snackBar.open('Please ensure all cost values are valid.', 'Close', { duration: 3000 });
       return;
     }
     
     const formValues = this.additionalCostsForm.value;
     
     // Show loading state
     this.loading = true;
     
     // Log debug info before sending request
     console.log('Updating order pricing:', {
       orderId: this.order._id,
       transportationCost: formValues.transportationCost,
       additionalRentalCost: formValues.additionalRentalCost
     });
     console.log('Auth token present:', !!this.authService.getToken());
     
     this.orderService.updateOrder(this.order._id, {
       transportationCost: formValues.transportationCost,
       additionalRentalCost: formValues.additionalRentalCost
     }).subscribe({
       next: (updatedOrder) => {
         this.order = updatedOrder;
         this.snackBar.open('Additional costs updated successfully!', 'Close', {
           duration: 3000
         });
         this.loading = false;
         this.closePricingDialog();
       },
       error: (err) => {
         console.error('Error updating additional costs:', err);
         this.loading = false;
         
         // Enhanced error handling
         if (err.status === 401 || err.status === 403) {
           this.snackBar.open('Authorization failed. Please refresh the page or log in again.', 'Refresh', {
             duration: 5000
           }).onAction().subscribe(() => {
             window.location.reload();
           });
         } else {
           this.snackBar.open(err.message || 'Failed to update additional costs. Please try again.', 'Close', {
             duration: 3000
           });
         }
       }
     });
   }
 
   openFullImage(imageUrl: string): void {
     this.currentFullImage = imageUrl;
     this.fullImageDialogRef = this.dialog.open(this.fullImageTemplate, {
       width: '90%',
       maxWidth: '1000px'
     });
   }
 
   closeFullImage(): void {
     if (this.fullImageDialogRef) {
       this.fullImageDialogRef.close();
       this.fullImageDialogRef = null;
     }
   }
 
   cancelOrder(): void {
     this.cancellationReason = '';
     this.cancelDialogRef = this.dialog.open(this.cancelDialogTemplate, {
       width: '500px',
       disableClose: true
     });
   }
 
   closeCancelDialog(): void {
     if (this.cancelDialogRef) {
       this.cancelDialogRef.close();
       this.cancelDialogRef = null;
     }
   }
 
   confirmCancellation(): void {
     if (!this.order || !this.cancellationReason.trim()) {
       this.snackBar.open('Please provide a reason for cancellation.', 'Close', { duration: 3000 });
       return;
     }
 
     // Show loading state
     this.loading = true;
     
     this.orderService.cancelOrder(this.order._id, this.cancellationReason).subscribe({
       next: (updatedOrder) => {
         this.order = updatedOrder;
         this.snackBar.open('Order cancelled successfully!', 'Close', {
           duration: 3000
         });
         this.loading = false;
         this.closeCancelDialog();
         
         // Notify the customer
         this.notifyCustomer('Order Cancelled', `Your order #${updatedOrder.orderNumber} has been cancelled. Reason: ${this.cancellationReason}`);
       },
       error: (err) => {
         console.error('Error cancelling order:', err);
         this.loading = false;
         
         if (err.status === 401 || err.status === 403) {
           this.snackBar.open('Authorization failed. Please refresh the page or log in again.', 'Refresh', {
             duration: 5000
           }).onAction().subscribe(() => {
             window.location.reload();
           });
         } else {
           this.snackBar.open(err.message || 'Failed to cancel order. Please try again.', 'Close', {
             duration: 3000
           });
         }
       }
     });
   }
 
   confirmOrderAfterPricing(): void {
     if (!this.order || !this.additionalCostsForm.valid) {
       this.snackBar.open('Please ensure all cost values are valid.', 'Close', { duration: 3000 });
       return;
     }
 
     // Show loading state
     this.loading = true;
     
     const formValues = this.additionalCostsForm.value;
     
     // Log debug info before sending request
     console.log('Confirming order with pricing:', {
       orderId: this.order._id,
       transportationCost: formValues.transportationCost,
       additionalRentalCost: formValues.additionalRentalCost
     });
     console.log('Auth token present:', !!this.authService.getToken());
     
     this.orderService.confirmOrder(this.order._id, {
       transportationCost: formValues.transportationCost,
       additionalRentalCost: formValues.additionalRentalCost
     }).subscribe({
       next: (updatedOrder) => {
         this.order = updatedOrder;
         this.snackBar.open('Order confirmed successfully!', 'Close', {
           duration: 3000
         });
         this.loading = false;
         this.closePricingDialog();
         
         // Notify the customer
         this.notifyCustomer('Order Confirmed', `Your order #${updatedOrder.orderNumber} has been confirmed. Total amount: Rs. ${this.calculateTotalPrice()}`);
       },
       error: (err) => {
         console.error('Error confirming order:', err);
         this.loading = false;
         
         if (err.status === 401 || err.status === 403) {
           this.snackBar.open('Authorization failed. Please refresh the page or log in again.', 'Refresh', {
             duration: 5000
           }).onAction().subscribe(() => {
             window.location.reload();
           });
         } else {
           this.snackBar.open(err.message || 'Failed to confirm order. Please try again.', 'Close', {
             duration: 3000
           });
         }
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
         // Show loading state
         this.loading = true;
         
         this.orderService.updateOrder(this.order!._id, { status }).subscribe({
           next: (updatedOrder) => {
             this.order = updatedOrder;
             this.snackBar.open('Order status updated successfully!', 'Close', {
               duration: 3000
             });
             this.loading = false;
             
             // Notify the customer about status change
             const statusMessage = this.getStatusChangeMessage(status);
             this.notifyCustomer('Order Status Update', statusMessage);
           },
           error: (err) => {
             console.error('Error updating order status:', err);
             this.loading = false;
             
             if (err.status === 401 || err.status === 403) {
               this.snackBar.open('Authorization failed. Please refresh the page or log in again.', 'Refresh', {
                 duration: 5000
               }).onAction().subscribe(() => {
                 window.location.reload();
               });
             } else {
               this.snackBar.open(err.message || 'Failed to update order status. Please try again.', 'Close', {
                 duration: 3000
               });
             }
           }
         });
       }
     });
   }
 
   // Helper method to generate status change messages for notifications
   private getStatusChangeMessage(status: string): string {
     const orderNumber = this.order?.orderNumber || '';
     
     switch (status) {
       case 'in-progress':
         return `Your order #${orderNumber} is now in progress. We're working on your custom decoration!`;
       case 'ready-for-delivery':
         return `Your order #${orderNumber} is ready for delivery. We'll be in touch shortly to arrange delivery details.`;
       case 'completed':
         return `Your order #${orderNumber} has been completed. Thank you for choosing our services!`;
       default:
         return `Your order #${orderNumber} status has been updated to ${this.getStatusLabel(status)}.`;
     }
   }
 
   // Helper method to notify customers about order changes
   private notifyCustomer(title: string, message: string): void {
     // This would typically connect to your backend notification service
     // For now, we'll just log the notification
     console.log(`Customer notification - ${title}: ${message}`);
     
     // In a real implementation, you would send this to your backend
     // this.notificationService.sendCustomerNotification(this.order!.customerId, title, message);
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
 
   goBack(): void {
     this.router.navigate(['/admin/orders']);
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
