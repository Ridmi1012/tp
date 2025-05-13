import { CommonModule } from '@angular/common';
import { Component , OnInit} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ItemService } from '../../../services/item.service';
import { CategoryService } from '../../../services/category.service';
import { OrderService } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';
import { CloudinaryserviceService } from '../../../services/cloudinaryservice.service';
import { CreateOrderData } from '../../../services/order.service';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Validators } from '@angular/forms';



interface OrderItem {
  itemId: number;
  itemName: string;
  itemCategory: string;
  quantity: number;
  pricePerUnit: number;
  status: 'active' | 'dropped';
}

@Component({
  selector: 'app-fully-customize-design',
  imports: [CommonModule, FormsModule,ReactiveFormsModule],
  templateUrl: './fully-customize-design.component.html',
  styleUrl: './fully-customize-design.component.css'
})
export class FullyCustomizeDesignComponent implements OnInit{
  orderForm!: FormGroup;
  
  // Theme and concept options
  themeColors = [
    { value: 'gold-white', label: 'Gold & White' },
    { value: 'silver-white', label: 'Silver & White' },
    { value: 'rose-gold', label: 'Rose Gold' },
    { value: 'blue-silver', label: 'Blue & Silver' },
    { value: 'pink-gold', label: 'Pink & Gold' },
    { value: 'purple-silver', label: 'Purple & Silver' },
    { value: 'red-gold', label: 'Red & Gold' },
    { value: 'green-gold', label: 'Green & Gold' },
    { value: 'custom', label: 'Custom Color Theme' }
  ];

  conceptOptions = [
    { value: 'elegant', label: 'Elegant & Classic' },
    { value: 'modern', label: 'Modern & Minimalist' },
    { value: 'rustic', label: 'Rustic & Natural' },
    { value: 'vintage', label: 'Vintage & Retro' },
    { value: 'glamorous', label: 'Glamorous & Luxurious' },
    { value: 'playful', label: 'Fun & Playful' },
    { value: 'romantic', label: 'Romantic & Dreamy' },
    { value: 'traditional', label: 'Traditional & Cultural' },
    { value: 'custom', label: 'Custom Concept' }
  ];

  // Data
  categories: any[] = [];
  items: any[] = [];
  orderItems: OrderItem[] = [];
  inspirationPhotos: string[] = [];
  
  // UI states
  loading = false;
  uploadingPhoto = false;
  submitError = '';
  successMessage = '';
  showSuccessMessage = false;
  
  // Event timing
  minEventDate = '';
  orderStatus: 'canPlace' | 'contactOwner' | 'cannotPlace' = 'canPlace';
  hoursDifference = 0;
  
  // Pricing
  totalItemsPrice = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private itemService: ItemService,
    private categoryService: CategoryService,
    private orderService: OrderService,
    private authService: AuthService,
    private cloudinaryService: CloudinaryserviceService
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.setMinEventDate();
    this.loadCategories();
    this.loadItems();
    this.loadUserDetails();
  }

  initializeForm() {
    this.orderForm = this.fb.group({
      // Customer info
      customerInfo: this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        contact: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
        relationshipToPerson: ['', Validators.required]
      }),
      
      // Design customization
      themeColor: ['', Validators.required],
      customThemeColor: [''],
      conceptCustomization: ['', Validators.required],
      customConcept: [''],
      specialNote: [''],
      
      // Personalization
      customName: ['', Validators.required],
      customAge: ['', [Validators.required, Validators.min(1), Validators.max(150)]],
      
      // Event details
      venue: ['', Validators.required],
      eventDate: ['', Validators.required],
      eventTime: ['', Validators.required],
      eventCategory: ['', Validators.required]
    });

    // Add validators for custom fields
    this.orderForm.get('themeColor')?.valueChanges.subscribe(value => {
      const customColorControl = this.orderForm.get('customThemeColor');
      if (value === 'custom') {
        customColorControl?.setValidators([Validators.required]);
      } else {
        customColorControl?.clearValidators();
      }
      customColorControl?.updateValueAndValidity();
    });

    this.orderForm.get('conceptCustomization')?.valueChanges.subscribe(value => {
      const customConceptControl = this.orderForm.get('customConcept');
      if (value === 'custom') {
        customConceptControl?.setValidators([Validators.required]);
      } else {
        customConceptControl?.clearValidators();
      }
      customConceptControl?.updateValueAndValidity();
    });

    // Watch for event timing changes
    this.orderForm.get('eventDate')?.valueChanges.subscribe(() => this.checkEventTiming());
    this.orderForm.get('eventTime')?.valueChanges.subscribe(() => this.checkEventTiming());
  }

  loadUserDetails() {
  // First, try to get from localStorage
  const userDetails = this.authService.getUserDetails();
  if (userDetails) {
    this.orderForm.patchValue({
      customerInfo: {
        firstName: userDetails.firstName || '',
        lastName: userDetails.lastName || '',
        email: userDetails.email || '',
        contact: userDetails.contact || ''
      }
    });
  }
  
  // Optionally, fetch fresh data from server
  this.authService.getCustomerDetails().subscribe({
    next: (customerData) => {
      if (customerData) {
        this.orderForm.patchValue({
          customerInfo: {
            firstName: customerData.firstName || '',
            lastName: customerData.lastName || '',
            email: customerData.email || '',
            contact: customerData.contact || ''
          }
        });
      }
    },
    error: (error) => {
      console.error('Error fetching customer details:', error);
      // Fall back to localStorage data
    }
  });
}

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadItems() {
    this.itemService.getItems().subscribe({
      next: (items) => {
        this.items = items;
      },
      error: (error) => {
        console.error('Error loading items:', error);
      }
    });
  }

  getAvailableItems() {
    // Filter out items that are already added
    const addedItemIds = this.orderItems.map(item => item.itemId);
    return this.items.filter(item => !addedItemIds.includes(item.itemID));
  }

  addNewItem(itemId: number) {
    if (!itemId) return;
    
    const item = this.items.find(i => i.itemID === itemId);
    if (item) {
      const orderItem: OrderItem = {
        itemId: item.itemID,
        itemName: item.name,
        itemCategory: item.category?.name || '',
        quantity: 1,
        pricePerUnit: item.unitPrice || item.pricePerUnit || 0,
        status: 'active'
      };
      
      this.orderItems.push(orderItem);
      this.updateTotalPrice();
    }
  }

  removeItem(item: OrderItem) {
    const index = this.orderItems.findIndex(i => i.itemId === item.itemId);
    if (index > -1) {
      this.orderItems.splice(index, 1);
      this.updateTotalPrice();
    }
  }

  onQuantityChange(item: OrderItem, event: any) {
    const newQuantity = parseInt(event.target.value);
    if (newQuantity > 0) {
      item.quantity = newQuantity;
      this.updateTotalPrice();
    }
  }

  updateTotalPrice() {
    this.totalItemsPrice = this.orderItems.reduce((total, item) => {
      return total + (item.quantity * item.pricePerUnit);
    }, 0);
  }

  async uploadInspirationPhoto(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (this.inspirationPhotos.length >= 3) {
      this.submitError = 'You can only upload up to 3 inspiration photos';
      return;
    }

    this.uploadingPhoto = true;
    this.submitError = '';

    try {
      const response = await this.cloudinaryService.uploadImage(file).toPromise();
      
      if (!response || !response.secure_url) {
        throw new Error('Invalid response from Cloudinary');
      }
      
      this.inspirationPhotos.push(response.secure_url);
      this.uploadingPhoto = false;
    } catch (error) {
      console.error('Error uploading photo:', error);
      this.submitError = 'Failed to upload photo. Please try again.';
      this.uploadingPhoto = false;
    }
  }

  removeInspirationPhoto(index: number) {
    this.inspirationPhotos.splice(index, 1);
  }

  setMinEventDate() {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    this.minEventDate = today.toISOString().split('T')[0];
  }

  checkEventTiming() {
    const eventDate = this.orderForm.get('eventDate')?.value;
    const eventTime = this.orderForm.get('eventTime')?.value;
    
    if (!eventDate || !eventTime) {
      this.orderStatus = 'canPlace';
      return;
    }
    
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    const currentTime = new Date();
    
    // Calculate hours difference
    this.hoursDifference = (eventDateTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    
    if (this.hoursDifference < 0) {
      this.orderForm.setErrors({ 'pastDateTime': true });
      this.orderStatus = 'cannotPlace';
    } else if (this.hoursDifference < 5) {
      this.orderStatus = 'cannotPlace';
    } else if (this.hoursDifference < 24) {
      this.orderStatus = 'contactOwner';
    } else {
      this.orderStatus = 'canPlace';
      this.orderForm.setErrors(null);
    }
  }

  onSubmit() {
    if (this.orderForm.invalid || this.orderItems.length === 0) {
      this.submitError = 'Please fill all required fields and select at least one item';
      return;
    }

    this.loading = true;
    this.submitError = '';

    const userDetails = this.authService.getUserDetails();
    const customerId = userDetails?.customerId || userDetails?.userId;

    const orderData: CreateOrderData = {
      designId: '0', // No existing design for full-custom
      orderType: 'full-custom',
      status: 'pending',
      customDetails: {
        customName: this.orderForm.value.customName,
        customAge: this.orderForm.value.customAge,
        venue: this.orderForm.value.venue,
        eventDate: this.orderForm.value.eventDate,
        eventTime: this.orderForm.value.eventTime,
        eventCategory: this.orderForm.value.eventCategory
      },
      customerInfo: this.orderForm.value.customerInfo,
      customerId: customerId,
      themeColor: this.orderForm.value.themeColor === 'custom' 
        ? this.orderForm.value.customThemeColor 
        : this.orderForm.value.themeColor,
      conceptCustomization: this.orderForm.value.conceptCustomization === 'custom'
        ? this.orderForm.value.customConcept
        : this.orderForm.value.conceptCustomization,
      specialNote: this.orderForm.value.specialNote,
      inspirationPhotos: this.inspirationPhotos,
      orderItems: this.orderItems
    };

    this.orderService.createOrder(orderData).subscribe({
      next: (response) => {
        this.showSuccessMessage = true;
        this.successMessage = 'Order created successfully!';
        this.loading = false;
        
        setTimeout(() => {
          this.router.navigate(['/orders']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error creating order:', error);
        this.submitError = error.error?.message || 'Failed to create order. Please try again.';
        this.loading = false;
      }
    });
  }

  onCancel() {
    if (confirm('Are you sure you want to cancel? All your changes will be lost.')) {
      this.router.navigate(['/']);
    }
  }
}
