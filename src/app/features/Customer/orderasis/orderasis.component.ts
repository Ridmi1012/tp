import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { DesignService, Design } from '../../../services/design.service';
import { OrderService, OrderAsIs } from '../../../services/order.service';

@Component({
  selector: 'app-orderasis',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './orderasis.component.html',
  styleUrl: './orderasis.component.css'
})
export class OrderasisComponent implements OnInit {
  design: Design | null = null;
  orderForm: FormGroup;
  loading = false;
  error = '';
  designId: number = 0;
  customerId: number = 0;
  submitted = false;
  orderSuccess = false;
  orderResponse: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private orderService: OrderService,
    private designService: DesignService,
    private authService: AuthService
  ) {
    this.orderForm = this.formBuilder.group({
      customName: ['', [Validators.required, Validators.maxLength(50)]],
      customAge: ['', [Validators.required, Validators.min(0), Validators.max(150)]],
      eventDate: ['', Validators.required],
      deliveryAddress: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  ngOnInit(): void {
    // Check authentication first before proceeding
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, redirecting to login');
      this.router.navigate(['/login'], { 
        queryParams: { 
          returnUrl: this.router.url 
        } 
      });
      return;
    }

    // Get the current logged in customer
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('Current user:', user);
        if (user && user.customerId) {
          this.customerId = user.customerId;
          
          // Get design ID from route parameter
          const id = this.route.snapshot.paramMap.get('id');
          if (id) {
            this.designId = +id;
            this.loadDesign(this.designId);
          } else {
            this.error = 'Design ID not provided';
          }
        } else {
          // Redirect to login if no user or user without customerId
          console.log('No valid customer ID found, redirecting to login');
          this.router.navigate(['/login'], { 
            queryParams: { 
              returnUrl: this.router.url 
            } 
          });
        }
      },
      error: (err) => {
        console.error('Error getting current user', err);
        this.error = 'Please log in to place an order';
        // Redirect to login on error
        this.router.navigate(['/login'], { 
          queryParams: { 
            returnUrl: this.router.url 
          } 
        });
      }
    });
  }

  loadDesign(id: number): void {
    this.loading = true;
    this.designService.getDesignById(id).subscribe({
      next: (data: Design) => {
        this.design = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading design', err);
        this.error = 'Failed to load design details. Please try again.';
        this.loading = false;
      }
    });
  }

  // Handle image error event
  onImageError(event: any): void {
    event.target.src = '/assets/placeholder-image.png';
  }

  // Convenience getter for form fields
  get f() { return this.orderForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    // Stop here if form is invalid
    if (this.orderForm.invalid) {
      return;
    }

    this.loading = true;
    const orderData: OrderAsIs = {
      designId: this.designId,
      customerId: this.customerId,
      customName: this.f['customName'].value,
      customAge: this.f['customAge'].value,
      eventDate: this.f['eventDate'].value,
      deliveryAddress: this.f['deliveryAddress'].value
    };

    this.orderService.createOrderAsIs(orderData).subscribe({
      next: (response) => {
        this.loading = false;
        this.orderSuccess = true;
        this.orderResponse = response;
      },
      error: (err) => {
        console.error('Error creating order', err);
        this.loading = false;
        this.error = 'Failed to place order. Please try again.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/design-details', this.designId]);
  }

  goToOrderDetails(): void {
    if (this.orderResponse && this.orderResponse.orderId) {
      this.router.navigate(['/order-details', this.orderResponse.orderId]);
    }
  }
}
