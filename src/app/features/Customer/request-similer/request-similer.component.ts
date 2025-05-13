import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OrderService } from '../../../services/order.service';
import { DesignService, Design } from '../../../services/design.service';
import { CategoryService } from '../../../services/category.service';
import { ItemService } from '../../../services/item.service'; // NEW import
import { AuthService } from '../../../services/auth.service';



// NEW interface for request similar order items
export interface OrderItemData {
  itemId: number;
  itemName: string;
  itemCategory: string;
  quantity: number;
  pricePerUnit: number;
  status: 'active' | 'dropped';
  isOriginal?: boolean; // Flag to identify original design items
}

@Component({
  selector: 'app-request-similer',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './request-similer.component.html',
  styleUrl: './request-similer.component.css'
})
export class RequestSimilerComponent implements OnInit{
   orderForm!: FormGroup;
  loading = false;
  submitError: string | null = null;
  showSuccessMessage = false;
  successMessage = '';
  
  design: Design | null = null;
  categories: any[] = [];
  allItems: any[] = []; // NEW - All available items to add
  orderItems: OrderItemData[] = []; // NEW - Current order items
  
  // Time-related properties
  minEventDate: string = '';
  orderStatus: 'canPlace' | 'contactOwner' | 'cannotPlace' = 'canPlace';
  hoursDifference = 0;
  
  // NEW - Customization properties
  themeColors = [
    { value: 'original', label: 'Original Theme' },
    { value: 'blue', label: 'Blue Theme' },
    { value: 'red', label: 'Red Theme' },
    { value: 'gold', label: 'Gold Theme' },
    { value: 'silver', label: 'Silver Theme' },
    { value: 'green', label: 'Green Theme' },
    { value: 'purple', label: 'Purple Theme' },
    { value: 'pink', label: 'Pink Theme' },
    { value: 'custom', label: 'Custom Color' }
  ];
  
  conceptOptions = [
    { value: 'original', label: 'Keep Original Concept' },
    { value: 'modern', label: 'Modern Style' },
    { value: 'traditional', label: 'Traditional Style' },
    { value: 'minimalist', label: 'Minimalist Approach' },
    { value: 'elegant', label: 'Elegant & Sophisticated' },
    { value: 'rustic', label: 'Rustic Style' },
    { value: 'vintage', label: 'Vintage Theme' },
    { value: 'custom', label: 'Custom Concept' }
  ];

  // NEW - Pricing
  totalItemsPrice = 0;
  estimatedTotal = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private orderService: OrderService,
    private designService: DesignService,
    private categoryService: CategoryService,
    private itemService: ItemService, // NEW dependency
    private authService: AuthService
  ) {}

  ngOnInit(): void {
  const designId = this.route.snapshot.paramMap.get('id');
  
  if (!this.authService.isLoggedIn()) {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: `/request-similar/${designId}` }
    });
    return;
  }
  
  // First, try to get data from localStorage
  const localUserDetails = this.authService.getUserDetails();
  
  // Check if we have all required fields
  if (localUserDetails && localUserDetails.email && localUserDetails.contact) {
    // We have all data, just initialize the form
    this.initializeForm();
  } else {
    // Missing data, fetch from backend
    this.fetchAndInitializeUserData();
  }
  
  this.setMinEventDate();
  
  if (designId) {
    this.loadDesign(+designId);
    this.loadCategories();
    this.loadAllItems();
  }
}

// New method to fetch complete data when needed
fetchAndInitializeUserData(): void {
  this.authService.getCustomerDetails().subscribe({
    next: (completeDetails) => {
      console.log('Fetched complete customer details:', completeDetails);
      this.initializeForm(); // Form will now use updated data from localStorage
    },
    error: (error) => {
      console.error('Error fetching customer details:', error);
      this.initializeForm(); // Initialize with whatever data we have
    }
  });
}

  onQuantityChange(item: OrderItemData, event: Event): void {
  const target = event.target as HTMLInputElement;
  const quantity = parseInt(target.value, 10);
  if (!isNaN(quantity) && quantity > 0) {
    this.updateItemQuantity(item, quantity);
  }
}

  initializeForm(): void {
  const userDetails = this.authService.getUserDetails();
  
  console.log('Initializing form with user details:', userDetails);
  
  this.orderForm = this.fb.group({
    customerInfo: this.fb.group({
      firstName: [userDetails?.firstName || '', Validators.required],
      lastName: [userDetails?.lastName || '', Validators.required],
      email: [userDetails?.email || '', [Validators.required, Validators.email]],
      contact: [userDetails?.contact || '', [
        Validators.required,
        Validators.pattern(/^[0-9]{10,15}$/)
      ]],
      relationshipToPerson: ['', Validators.required]
    }),
      
      // Personalization details
      customName: ['', Validators.required],
      customAge: ['', [Validators.required, Validators.min(1), Validators.max(120)]],
      
      // Event details
      venue: ['', Validators.required],
      eventDate: ['', Validators.required],
      eventTime: ['', Validators.required],
      eventCategory: ['', Validators.required],
      
      // NEW - Customization fields
      themeColor: ['original', Validators.required],
      customThemeColor: [''], // For custom color input
      conceptCustomization: ['original', Validators.required],
      customConcept: [''] // For custom concept input
    });
    
    // Watch for theme color changes
    this.orderForm.get('themeColor')?.valueChanges.subscribe(value => {
      const customThemeControl = this.orderForm.get('customThemeColor');
      if (value === 'custom') {
        customThemeControl?.setValidators([Validators.required]);
      } else {
        customThemeControl?.clearValidators();
      }
      customThemeControl?.updateValueAndValidity();
    });
    
    // Watch for concept changes
    this.orderForm.get('conceptCustomization')?.valueChanges.subscribe(value => {
      const customConceptControl = this.orderForm.get('customConcept');
      if (value === 'custom') {
        customConceptControl?.setValidators([Validators.required]);
      } else {
        customConceptControl?.clearValidators();
      }
      customConceptControl?.updateValueAndValidity();
    });
    
    // Watch for event date/time changes
    this.orderForm.get('eventDate')?.valueChanges.subscribe(() => {
      this.validateEventDateTime();
    });
    
    this.orderForm.get('eventTime')?.valueChanges.subscribe(() => {
      this.validateEventDateTime();
    });
  }

  // NEW - Load all available items
  loadAllItems(): void {
    this.itemService.getItems().subscribe({
      next: (items) => {
        this.allItems = items;
      },
      error: (error) => {
        console.error('Error loading items:', error);
      }
    });
  }

  loadDesign(id: number): void {
    this.designService.getDesignById(id).subscribe({
      next: (design) => {
        this.design = design;
        // NEW - Initialize order items from design items
        this.initializeOrderItems();
      },
      error: (error) => {
        console.error('Error loading design:', error);
        this.submitError = 'Failed to load design details';
      }
    });
  }

 initializeOrderItems(): void {
    if (this.design && this.design.items) {
      this.orderItems = this.design.items.map(designItem => ({
        itemId: designItem.item.itemID,
        itemName: designItem.item.name,
        itemCategory: designItem.item.category?.categoryID?.toString() || '', // Fixed property name
        quantity: designItem.defaultQuantity,
        pricePerUnit: designItem.item.unitPrice || designItem.item.pricePerUnit || 0, // Handle both property names
        status: 'active' as 'active' | 'dropped',
        isOriginal: true
      }));
      this.calculatePrices();
    }
  }

  // NEW - Toggle item status (active/dropped)
  toggleItemStatus(item: OrderItemData): void {
    item.status = item.status === 'active' ? 'dropped' : 'active';
    this.calculatePrices();
  }

  // NEW - Update item quantity
  updateItemQuantity(item: OrderItemData, quantity: number): void {
    if (quantity > 0) {
      item.quantity = quantity;
      this.calculatePrices();
    }
  }

   // MODIFIED - Add new item to order
  addNewItem(itemId: number): void {
    if (!itemId || itemId === 0) return; // Guard against invalid selection
    
    const item = this.allItems.find(i => i.itemID === itemId);
    if (item) {
      // Check if item already exists
      const existingItem = this.orderItems.find(oi => oi.itemId === itemId);
      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.status = 'active';
      } else {
        this.orderItems.push({
          itemId: item.itemID,
          itemName: item.name,
          itemCategory: item.category?.categoryID?.toString() || '', // Fixed property access
          quantity: 1,
          pricePerUnit: item.unitPrice || 0, // Use unitPrice from Item interface
          status: 'active',
          isOriginal: false
        });
      }
      this.calculatePrices();
    }
  }


  // NEW - Remove item from order
  removeItem(item: OrderItemData): void {
    if (!item.isOriginal) {
      const index = this.orderItems.indexOf(item);
      if (index > -1) {
        this.orderItems.splice(index, 1);
        this.calculatePrices();
      }
    }
  }

  // NEW - Calculate total prices
  calculatePrices(): void {
    this.totalItemsPrice = this.orderItems
      .filter(item => item.status === 'active')
      .reduce((total, item) => total + (item.pricePerUnit * item.quantity), 0);
    
    // Estimated total (without transportation and additional costs)
    this.estimatedTotal = this.totalItemsPrice;
  }

  // Get available items that are not already in the order
  getAvailableItems(): any[] {
    const orderItemIds = this.orderItems.map(oi => oi.itemId);
    return this.allItems.filter(item => !orderItemIds.includes(item.itemID));
  }

  // Existing methods remain the same
  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  setMinEventDate(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minEventDate = tomorrow.toISOString().split('T')[0];
  }

  validateEventDateTime(): void {
    const eventDate = this.orderForm.get('eventDate')?.value;
    const eventTime = this.orderForm.get('eventTime')?.value;
    
    if (eventDate && eventTime) {
      const eventDateTime = new Date(`${eventDate}T${eventTime}`);
      const now = new Date();
      const diffMs = eventDateTime.getTime() - now.getTime();
      this.hoursDifference = diffMs / (1000 * 60 * 60);
      
      if (this.hoursDifference < 0) {
        this.orderForm.setErrors({ 'pastDateTime': true });
        this.orderStatus = 'cannotPlace';
      } else if (this.hoursDifference < 5) {
        this.orderStatus = 'cannotPlace';
      } else if (this.hoursDifference < 18) {
        this.orderStatus = 'contactOwner';
      } else {
        this.orderStatus = 'canPlace';
      }
    }
  }

  onSubmit(): void {
    if (this.orderForm.valid && this.orderStatus === 'canPlace' && this.design) {
      this.loading = true;
      this.submitError = null;
      
      const formValue = this.orderForm.value;
      const userDetails = this.authService.getUserDetails();
      
      // Get the actual values for custom fields
      const themeColor = formValue.themeColor === 'custom' 
        ? formValue.customThemeColor 
        : formValue.themeColor;
        
      const conceptCustomization = formValue.conceptCustomization === 'custom'
        ? formValue.customConcept
        : formValue.conceptCustomization;
      
      // Modified order request for request-similar
      const orderData = {
        designId: this.design.designID.toString(),
        orderType: 'request-similar', // NEW - Different order type
        status: 'pending',
        themeColor: themeColor, // NEW field
        conceptCustomization: conceptCustomization, // NEW field
        customDetails: {
          customName: formValue.customName,
          customAge: formValue.customAge,
          venue: formValue.venue,
          eventDate: formValue.eventDate,
          eventTime: formValue.eventTime,
          eventCategory: formValue.eventCategory,
          relationshipToPerson: formValue.customerInfo.relationshipToPerson
        },
        customerInfo: {
          firstName: formValue.customerInfo.firstName,
          lastName: formValue.customerInfo.lastName,
          email: formValue.customerInfo.email,
          contact: formValue.customerInfo.contact,
          relationshipToPerson: formValue.customerInfo.relationshipToPerson
        },
        // NEW - Add order items
        orderItems: this.orderItems.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          itemCategory: item.itemCategory,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          status: item.status
        })),
        customerId: userDetails?.id
      };
      
      this.orderService.createOrder(orderData as any).subscribe({
        next: (response) => {
          this.loading = false;
          this.showSuccessMessage = true;
          this.successMessage = 'Order submitted successfully! Redirecting...';
          
          setTimeout(() => {
            this.router.navigate(['/profile/orders']);
          }, 3000);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error submitting order:', error);
          this.submitError = error.error?.message || 'Failed to submit order. Please try again.';
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/portfolio']);
  }

}
