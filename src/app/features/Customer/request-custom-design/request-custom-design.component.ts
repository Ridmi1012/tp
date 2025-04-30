import { Component, OnInit} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators,  } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ItemService, Item } from '../../../services/item.service';
import { CloudinaryserviceService } from '../../../services/cloudinaryservice.service';
import { OrderService, FullyCustomOrder, CustomItem } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-request-custom-design',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './request-custom-design.component.html',
  styleUrl: './request-custom-design.component.css'
})
export class RequestCustomDesignComponent implements OnInit {
  customRequestForm: FormGroup;
  allItems: Item[] = [];
  filteredItems: Item[] = [];
  searchQuery: string = '';
  
  inspirationImages: File[] = [];
  inspirationPreviewUrls: string[] = [];
  uploadedImageUrls: string[] = [];
  
  customerId: number = 0;
  loading: boolean = false;
  itemsLoading: boolean = false;
  imageUploading: boolean = false;
  submitLoading: boolean = false;
  
  error: string = '';
  submitError: string = '';
  submitSuccess: boolean = false;
  orderResponse: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private itemService: ItemService,
    private cloudinaryService: CloudinaryserviceService,
    private orderService: OrderService,
    private authService: AuthService
  ) {
    this.customRequestForm = this.fb.group({
      customName: ['', [Validators.required, Validators.maxLength(50)]],
      customAge: ['', [Validators.required, Validators.min(0), Validators.max(150)]],
      eventDate: ['', Validators.required],
      deliveryAddress: ['', [Validators.required, Validators.maxLength(200)]],
      themeName: ['', [Validators.required, Validators.maxLength(50)]],
      themeColor: [''],
      conceptDescription: ['', Validators.required],
      customItems: this.fb.array([])
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

    // Get user ID
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (user && user.userId) {
          this.customerId = user.userId;
          this.loadItems();
        } else {
          this.error = 'User not authenticated';
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        console.error('Error getting current user', err);
        this.error = 'Authentication error';
      }
    });
  }

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

  filterItems(): void {
    if (!this.searchQuery) {
      this.filteredItems = [...this.allItems];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredItems = this.allItems.filter(item => 
        item.name.toLowerCase().includes(query) || 
        (item.description ? item.description.toLowerCase().includes(query) : false)
      );
    }
  }

  // Form array getter
  get customItems(): FormArray {
    return this.customRequestForm.get('customItems') as FormArray;
  }

  // Add catalog item
  addCatalogItem(item: Item): void {
    this.customItems.push(this.fb.group({
      itemType: ['catalog'],
      itemId: [item.itemID],
      name: [item.name],
      price: [item.unitPrice],
      quantity: [1, [Validators.required, Validators.min(1)]],
      description: [item.description]
    }));
  }

  // Add custom item
  addCustomItem(): void {
    this.customItems.push(this.fb.group({
      itemType: ['custom'],
      customItemName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      description: ['', Validators.required]
    }));
  }

  // Remove item
  removeItem(index: number): void {
    this.customItems.removeAt(index);
  }

  // Handle inspiration image selection
  onInspirationImagesChange(event: any): void {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.inspirationImages.push(file);
        
        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.inspirationPreviewUrls.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  // Remove inspiration image
  removeInspirationImage(index: number): void {
    this.inspirationImages.splice(index, 1);
    this.inspirationPreviewUrls.splice(index, 1);
  }

  // Upload images to Cloudinary - Fixed with firstValueFrom
  async uploadImages(): Promise<string[]> {
    if (this.inspirationImages.length === 0) {
      return [];
    }
    
    this.imageUploading = true;
    const urls: string[] = [];
    
    try {
      for (const image of this.inspirationImages) {
        // Using firstValueFrom instead of deprecated toPromise()
        const response = await firstValueFrom(this.cloudinaryService.uploadImage(image));
        if (response && response.secure_url) {
          urls.push(response.secure_url);
        }
      }
      this.imageUploading = false;
      return urls;
    } catch (error) {
      console.error('Error uploading images', error);
      this.imageUploading = false;
      throw new Error('Failed to upload images');
    }
  }

  // Calculate total price estimation
  calculateTotalPrice(): number {
    let total = 50; // Base price for custom design
    
    // Add item prices
    this.customItems.controls.forEach(control => {
      const itemType = control.get('itemType')?.value;
      
      if (itemType === 'catalog') {
        const price = control.get('price')?.value || 0;
        const quantity = control.get('quantity')?.value || 0;
        total += price * quantity;
      } else {
        // Custom items have a fixed estimation cost
        const quantity = control.get('quantity')?.value || 0;
        total += 10 * quantity; // Estimate Rs.10 per custom item
      }
    });
    
    return total;
  }

  async onSubmit(): Promise<void> {
    if (this.customRequestForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.customRequestForm);
      return;
    }
    
    this.submitLoading = true;
    this.submitError = '';
    
    try {
      // Upload images if any
      let inspirationImageUrls: string[] = [];
      if (this.inspirationImages.length > 0) {
        inspirationImageUrls = await this.uploadImages();
      }
      
      // Prepare custom items array
      const customItems: CustomItem[] = this.customItems.controls.map(control => {
        const itemType = control.get('itemType')?.value;
        
        if (itemType === 'catalog') {
          return {
            itemId: control.get('itemId')?.value,
            quantity: control.get('quantity')?.value
          };
        } else {
          return {
            customItemName: control.get('customItemName')?.value,
            description: control.get('description')?.value,
            quantity: control.get('quantity')?.value
          };
        }
      });
      
      // Create order data
      const orderData: FullyCustomOrder = {
        customerId: this.customerId,
        customName: this.customRequestForm.value.customName,
        customAge: this.customRequestForm.value.customAge,
        eventDate: this.customRequestForm.value.eventDate,
        deliveryAddress: this.customRequestForm.value.deliveryAddress,
        themeName: this.customRequestForm.value.themeName,
        themeColor: this.customRequestForm.value.themeColor || undefined,
        conceptDescription: this.customRequestForm.value.conceptDescription,
        inspirationImageUrls: inspirationImageUrls.length > 0 ? inspirationImageUrls : undefined,
        items: customItems
      };
      
      // Submit order
      this.orderService.createFullyCustomOrder(orderData).subscribe({
        next: (response) => {
          this.submitLoading = false;
          this.submitSuccess = true;
          this.orderResponse = response;
        },
        error: (err) => {
          console.error('Error creating fully custom order', err);
          this.submitLoading = false;
          this.submitError = 'Failed to submit custom design request. Please try again.';
        }
      });
    } catch (error) {
      console.error('Error in form submission', error);
      this.submitLoading = false;
      this.submitError = 'An error occurred while processing your request.';
    }
  }

  // Fixed markFormGroupTouched method with proper type checking
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control) {
        if (control instanceof FormGroup) {
          this.markFormGroupTouched(control);
        } else if (control instanceof FormArray) {
          const formArray = control as FormArray;
          for (let i = 0; i < formArray.length; i++) {
            const arrayControl = formArray.at(i);
            if (arrayControl instanceof FormGroup) {
              this.markFormGroupTouched(arrayControl);
            } else {
              arrayControl.markAsTouched();
            }
          }
        } else {
          control.markAsTouched();
        }
      }
    });
  }

  goToPortfolio(): void {
    this.router.navigate(['/portfolio']);
  }

  goToOrderDetails(): void {
    if (this.orderResponse && this.orderResponse.orderId) {
      this.router.navigate(['/order-details', this.orderResponse.orderId]);
    }
  }
}
