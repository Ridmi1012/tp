import { Component , OnInit} from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderData, OrderService } from '../../../services/order.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CategoryService } from '../../../services/category.service';
import { AuthService } from '../../../services/auth.service';
import { take } from 'rxjs/operators';
import { Design } from '../../../services/design.service';
import { CustomerService } from '../../../services/customer.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-order-as-is',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './order-as-is.component.html',
  styleUrl: './order-as-is.component.css'
})
export class OrderAsIsComponent implements OnInit {
  orderForm!: FormGroup;
  categories: any[] = [];
  design: Design | null = null;
  loading = false;
  submitError: string | null = null;
  minEventDate: string;
  currentUser: any;
  orderStatus: 'cannotPlace' | 'contactOwner' | 'canPlace' = 'canPlace';
  hoursDifference: number = 0;

  // Add these properties
  showSuccessMessage = false;
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private customerService: CustomerService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar // Add this
  ) {
    // Set minimum event date to today
    const today = new Date();
    this.minEventDate = today.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.initializeForm();
    this.loadCategories();
    this.loadDesignDetails();
    
    // Get current user
    this.authService.getCurrentUser().pipe(take(1)).subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user) {
          this.loadCustomerDetails();
        }
      },
      error: (error) => {
        console.error('Error getting current user:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  initializeForm() {
    this.orderForm = this.fb.group({
      // Personalization Details
      customName: ['', Validators.required],
      customAge: ['', [Validators.required, Validators.min(1), Validators.max(150)]],
      
      // Event Details
      venue: ['', Validators.required],
      eventDate: ['', Validators.required],
      eventTime: ['', Validators.required],
      eventCategory: ['', Validators.required],
      
      // Customer Information
      customerInfo: this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        contact: ['', [Validators.required, Validators.pattern('^[0-9]{10,15}$')]],
        relationshipToPerson: ['', Validators.required]
      })
    }, { 
      validators: this.eventDateTimeValidator.bind(this) 
    });

    // Listen for date/time changes to update order status
    this.orderForm.get('eventDate')?.valueChanges.subscribe(() => {
      this.checkOrderStatus();
    });
    
    this.orderForm.get('eventTime')?.valueChanges.subscribe(() => {
      this.checkOrderStatus();
    });
  }

  loadCustomerDetails() {
    this.customerService.getCurrentCustomerDetails().subscribe({
      next: (customer) => {
        this.orderForm.get('customerInfo')?.patchValue({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          contact: customer.contact
        });
      },
      error: (error) => {
        console.error('Error loading customer details:', error);
        // Still allow proceeding if customer details can't be loaded
      }
    });
  }

  // Custom validator for event date and time
  eventDateTimeValidator(control: AbstractControl): ValidationErrors | null {
    const eventDate = control.get('eventDate')?.value;
    const eventTime = control.get('eventTime')?.value;

    if (!eventDate || !eventTime) {
      return null; // Let required validators handle empty values
    }

    const now = new Date();
    const eventDateTime = new Date(eventDate + 'T' + eventTime);
    
    // Check if event is in the past
    if (eventDateTime < now) {
      return { pastDateTime: true };
    }

    return null;
  }

  checkOrderStatus() {
    const eventDate = this.orderForm.get('eventDate')?.value;
    const eventTime = this.orderForm.get('eventTime')?.value;

    if (eventDate && eventTime) {
      const now = new Date();
      const eventDateTime = new Date(eventDate + 'T' + eventTime);
      this.hoursDifference = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (this.hoursDifference < 0) {
        this.orderStatus = 'cannotPlace';
      } else if (this.hoursDifference < 5) {
        this.orderStatus = 'cannotPlace';
      } else if (this.hoursDifference < 18) {
        this.orderStatus = 'contactOwner';
      } else {
        this.orderStatus = 'canPlace';
      }
    } else {
      this.orderStatus = 'canPlace';
    }
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

  loadDesignDetails() {
    const designId = this.route.snapshot.paramMap.get('designId');
    if (designId) {
      this.orderService.getDesignById(designId).subscribe({
        next: (design: Design) => {
          this.design = design;
        },
        error: (error) => {
          console.error('Error loading design:', error);
          this.router.navigate(['/portfolio']);
        }
      });
    }
  }

  onSubmit() {
    if (!this.currentUser) {
      console.error('User not authenticated');
      this.router.navigate(['/login']);
      return;
    }

    if (this.orderForm.valid && this.design && this.currentUser && this.orderStatus === 'canPlace') {
      this.loading = true;
      this.submitError = null;

      const formValue = this.orderForm.value;
      const orderData: OrderData = {
        designId: this.design.designID.toString(),
        orderType: 'as-is',
        customDetails: {
          customName: formValue.customName,
          customAge: formValue.customAge,
          venue: formValue.venue,
          eventDate: formValue.eventDate,
          eventTime: formValue.eventTime,
          eventCategory: formValue.eventCategory
        },
        customerInfo: formValue.customerInfo,
        status: 'pending',
        customerId: this.currentUser.username
      };

      console.log('Submitting order data:', orderData);

      this.orderService.createOrder(orderData).subscribe({
        next: (response) => {
          console.log('Order created successfully:', response);
          this.loading = false;
          
          // Show success message
          this.showSuccessMessage = true;
          this.successMessage = 'Your order has been sent! They\'ll review and confirm shortly.';
          
          // Navigate to ongoing orders after a short delay
          setTimeout(() => {
            this.router.navigate(['/ongoing']);
          }, 2000); // 2 seconds delay to show the message
        },
        error: (error) => {
          console.error('Error creating order:', error);
          this.loading = false;
          this.submitError = error.error?.message || 'Failed to submit order. Please try again.';
        }
      });
    } else {
      this.markFormGroupTouched(this.orderForm);
    }
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel() {
    this.router.navigate(['/portfolio']);
  }

  // Helper method to format phone number for display
  formatPhoneNumber(phoneNumber: string): string {
    // Assuming Sri Lankan phone number format
    return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
}

