import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { DesignService, Design } from '../../../services/design.service';
import { ItemService, Item } from '../../../services/item.service';
import { OrderService, CustomizedOrder, OrderItem } from '../../../services/order.service';
import { CommonModule } from '@angular/common';


// Interface for selected items
interface SelectedItem {
  itemId: number;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

@Component({
  selector: 'app-custom-design',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './custom-design.component.html',
  styleUrl: './custom-design.component.css'
})
export class CustomDesignComponent implements OnInit{
 // Form and data properties
 customizeForm!: FormGroup;
 design: Design | null = null;
 allItems: Item[] = [];
 filteredItems: Item[] = [];
 selectedItems: Map<number, SelectedItem> = new Map();
 itemSearchQuery: string = '';
 
 // Status flags
 loading: boolean = true;
 itemsLoading: boolean = false;
 submitLoading: boolean = false;
 submitSuccess: boolean = false;
 
 // Error handling
 error: string = '';
 submitError: string = '';
 orderResponse: any = null;
 
 // User info
 customerId: number = 0;
 designId: number = 0;

 constructor(
   private fb: FormBuilder,
   private router: Router,
   private route: ActivatedRoute,
   private designService: DesignService,
   private itemService: ItemService,
   private orderService: OrderService,
   private authService: AuthService
 ) {
   // Initialize the form with validators
   this.customizeForm = this.fb.group({
     customName: ['', [Validators.required, Validators.maxLength(50)]],
     customAge: ['', [Validators.required, Validators.min(0), Validators.max(150)]],
     eventDate: ['', Validators.required],
     deliveryAddress: ['', [Validators.required, Validators.maxLength(200)]],
     themeColor: [''],
     conceptDescription: ['']
   });
 }

 ngOnInit(): void {
   // Check if user is logged in
   if (!this.authService.isLoggedIn()) {
     this.router.navigate(['/login'], { 
       queryParams: { returnUrl: this.router.url }
     });
     return;
   }

   // Get user ID from auth service
   this.authService.getCurrentUser().subscribe({
     next: (user) => {
       if (user && user.userId) {
         this.customerId = user.userId;
         
         // Get design ID from route params
         this.route.params.subscribe(params => {
           if (params['id']) {
             this.designId = +params['id'];
             this.loadDesign(this.designId);
             this.loadItems();
           } else {
             this.error = 'Design ID not found';
             this.loading = false;
           }
         });
       } else {
         this.error = 'User not authenticated';
         this.loading = false;
         this.router.navigate(['/login']);
       }
     },
     error: (err) => {
       console.error('Error getting current user', err);
       this.error = 'Authentication error';
       this.loading = false;
     }
   });
 }

 // Load design details
 loadDesign(designId: number): void {
   this.designService.getDesignById(designId).subscribe({
     next: (design) => {
       this.design = design;
       this.loading = false;
     },
     error: (err) => {
       console.error('Error loading design', err);
       this.error = 'Failed to load design details';
       this.loading = false;
     }
   });
 }

 handleImageError(event: Event): void {
  const target = event.target as HTMLImageElement;
  if (target) {
    target.src = '/assets/placeholder-image.png';
  }
}

 // Load available items
 loadItems(): void {
   this.itemsLoading = true;
   this.itemService.getItems().subscribe({
     next: (items) => {
       this.allItems = items;
       this.filterItems();
       this.itemsLoading = false;
     },
     error: (err) => {
       console.error('Error loading items', err);
       this.error = 'Failed to load available items';
       this.itemsLoading = false;
     }
   });
 }

 // Filter items based on search query
 filterItems(): void {
   if (!this.itemSearchQuery) {
     this.filteredItems = [...this.allItems];
   } else {
     const query = this.itemSearchQuery.toLowerCase();
     this.filteredItems = this.allItems.filter(item => 
       item.name.toLowerCase().includes(query) || 
       (item.description ? item.description.toLowerCase().includes(query) : false)
     );
   }
 }

 // Add item to selection
 addItem(item: Item): void {
   const itemId = item.itemID;
   
   if (this.selectedItems.has(itemId)) {
     // Update quantity if already exists
     const existingItem = this.selectedItems.get(itemId)!;
     existingItem.quantity += 1;
     existingItem.total = existingItem.price * existingItem.quantity;
     this.selectedItems.set(itemId, existingItem);
   } else {
     // Add new item
     this.selectedItems.set(itemId, {
       itemId: itemId,
       name: item.name,
       price: item.unitPrice,
       quantity: 1,
       total: item.unitPrice
     });
   }
 }

 updateQuantity(itemId: number, event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  const parsedValue = parseInt(value, 10);
  
  if (!isNaN(parsedValue) && parsedValue > 0) {
    // Your existing update quantity logic
    const quantity = Math.max(1, parsedValue);
    const item = this.selectedItems.get(itemId)!;
    item.quantity = quantity;
    item.total = item.price * quantity;
    this.selectedItems.set(itemId, item);
  }
}

 // Remove item from selection
 removeItem(itemId: number): void {
   this.selectedItems.delete(itemId);
 }

 // Get selected items as array for template iteration
 getSelectedItemsList(): SelectedItem[] {
   return Array.from(this.selectedItems.values());
 }

 // Calculate total price
 getTotalPrice(): number {
   let basePrice = this.design?.basePrice || 0;
   const itemsTotal = Array.from(this.selectedItems.values())
     .reduce((sum, item) => sum + item.total, 0);
   
   return basePrice + itemsTotal;
 }

 // Handle form submission
 onSubmit(): void {
   if (this.customizeForm.invalid) {
     // Mark all fields as touched to trigger validation errors
     this.markFormGroupTouched(this.customizeForm);
     return;
   }
   
   this.submitLoading = true;
   this.submitError = '';
   
   // Create order items array
   const orderItems = Array.from(this.selectedItems.values()).map(item => ({
     itemId: item.itemId,
     quantity: item.quantity
   }));
   
   // Create order data
   const orderData: CustomizedOrder = {
     customerId: this.customerId,
     baseDesignId: this.designId,
     customName: this.customizeForm.value.customName,
     customAge: this.customizeForm.value.customAge,
     eventDate: this.customizeForm.value.eventDate,
     deliveryAddress: this.customizeForm.value.deliveryAddress,
     themeColor: this.customizeForm.value.themeColor || undefined,
    conceptDescription: this.customizeForm.value.conceptDescription || undefined,
    addItems: orderItems
   };
   
   // Submit order
   this.orderService.createCustomizedOrder(orderData).subscribe({
     next: (response) => {
       this.submitLoading = false;
       this.submitSuccess = true;
       this.orderResponse = response;
     },
     error: (err) => {
       console.error('Error creating custom order', err);
       this.submitLoading = false;
       this.submitError = 'Failed to submit order. Please try again.';
     }
   });
 }

 // Helper method to mark all form controls as touched
 private markFormGroupTouched(formGroup: FormGroup): void {
   Object.keys(formGroup.controls).forEach(key => {
     const control = formGroup.get(key);
     if (control) {
       control.markAsTouched();
     }
   });
 }

 // Navigation methods
 goBack(): void {
   this.router.navigate(['/design', this.designId]);
 }

 goToOrderDetails(): void {
   if (this.orderResponse && this.orderResponse.orderId) {
     this.router.navigate(['/order-details', this.orderResponse.orderId]);
   }
 }
}
