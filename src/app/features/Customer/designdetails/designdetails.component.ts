import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DesignService } from '../../../services/design.service';
import { Design } from '../../../services/design.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { OrderService } from '../../../services/order.service';
import { CloudinaryserviceService } from '../../../services/cloudinaryservice.service';

@Component({
  selector: 'app-designdetails',
  imports: [CommonModule, RouterModule],
  templateUrl: './designdetails.component.html',
  styleUrl: './designdetails.component.css'
})
export class DesigndetailsComponent implements OnInit {
 design!: Design; // Using definite assignment assertion
  loading: boolean = true;
  error: string = '';
  selectedImage: string = '';
  imagePlaceholder: string = '/assets/placeholder-image.png';
  showOrderModal = false;
  showLoginRedirectOverlay = false;

  showOrderConfirmationModal = false;
  confirmationOrderType: string = '';
  existingOrdersCount: number = 0;

  constructor(
    private designService: DesignService,
    private route: ActivatedRoute,
    private orderService: OrderService,
    private router: Router,
    private authService: AuthService,
    private cloudinaryService: CloudinaryserviceService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDesign(+id);
    } else {
      this.error = 'Design ID not provided';
      this.loading = false;
    }
     setTimeout(() => {
      this.showOrderModal = true;
    }, 5000);
  }

  toggleOrderModal() {
    this.showOrderModal = !this.showOrderModal;
  }
  
  closeOrderModal(event: Event) {
    event.preventDefault();
    this.showOrderModal = false;
  }

  loadDesign(id: number): void {
    this.loading = true;
    this.designService.getDesignById(id).subscribe({
      next: (data: Design) => {
        this.design = data;
        
        // Ensure additionalImages is at least an empty array if undefined
        if (!this.design.additionalImages) {
          this.design.additionalImages = [];
        }
        
        // Set selected image to the main design image URL
        if (data.imageUrl && data.imageUrl.includes('cloudinary')) {
          // If it's already a full Cloudinary URL, use it directly
          this.selectedImage = data.imageUrl;
        } else if (data.imageUrl) {
          // If it's a public ID, get the full URL
          this.selectedImage = this.getCloudinaryImageUrl(data.imageUrl);
        } else {
          // Fallback to placeholder
          this.selectedImage = this.imagePlaceholder;
        }
        
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading design', err);
        this.error = 'Failed to load design details. Please try again.';
        this.loading = false;
      }
    });
  }

  onImageError(event: any): void {
    if (event && event.target) {
      event.target.src = this.imagePlaceholder;
    }
  }

  setSelectedImage(imageUrl: string): void {
    // Handle null/undefined URL gracefully
    if (!imageUrl) {
      this.selectedImage = this.imagePlaceholder;
      return;
    }
    
    // Handle Cloudinary URLs if needed
    if (imageUrl.includes('cloudinary')) {
      this.selectedImage = imageUrl;
    } else {
      this.selectedImage = this.getCloudinaryImageUrl(imageUrl);
    }
  }

  // Helper to get Cloudinary URL from public ID
  getCloudinaryImageUrl(publicId: string): string {
    if (!publicId) return this.imagePlaceholder;
    return this.cloudinaryService.getImageUrl(publicId);
  }

  private redirectToLogin(returnUrl: string): void {
    this.showLoginRedirectOverlay = true;
    setTimeout(() => {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl }
      });
    }, 2000); // Show message for 2 seconds before redirecting
  }

   orderAsIs(): void {
    this.showOrderModal = false;
    const isLoggedIn = this.authService.isLoggedIn();
    console.log('User logged in status:', isLoggedIn);
    
    if (isLoggedIn) {
      // Check for existing ongoing orders for this design
      this.checkExistingOrders('as-is');
    } else {
      console.log('User not logged in, showing message then redirecting to login');
      const returnUrl = `/order-as-is/${this.design.designID}`;
      this.redirectToLogin(returnUrl);
    }
  }

  customizeDesign(): void {
  // Check login status for customize design too
  this.showOrderModal = false;
  if (this.authService.isLoggedIn()) {
    // Check for existing orders for this design
    this.checkExistingOrders('customize');
  } else {
    const returnUrl = `/fully-customize-design/${this.design.designID}`;
    this.redirectToLogin(returnUrl);
  }
}

   requestSimilarDesign(): void {
    this.showOrderModal = false;
    if (this.authService.isLoggedIn()) {
      // Check for existing ongoing orders for this design
      this.checkExistingOrders('similar');
    } else {
      const returnUrl = `/request-similar/${this.design.designID}`;
      this.redirectToLogin(returnUrl);
    }
  }

   private checkExistingOrders(orderType: string): void {
  const userDetails = this.authService.getUserDetails();
  const customerId = userDetails?.customerId?.toString();
  
  console.log('Checking existing orders:', { customerId, designId: this.design.designID });
  
  if (!customerId || !this.design) {
    console.log('Missing customerId or design, proceeding with order');
    this.proceedWithOrder(orderType);
    return;
  }

  // First, let's properly style the confirmation dialog to make sure it's visible
  this.applyConfirmationOverlayStyles();

  this.orderService.checkOngoingOrderForDesign(customerId, this.design.designID.toString()).subscribe({
    next: (hasExistingOrder) => {
      console.log('Has existing order check result:', hasExistingOrder);
      if (hasExistingOrder) {
        // Get the count of existing orders
        this.orderService.getOngoingOrdersForDesign(customerId, this.design.designID.toString()).subscribe({
          next: (orders) => {
            this.existingOrdersCount = orders.length;
            console.log('Found existing orders:', this.existingOrdersCount);
            this.confirmationOrderType = orderType;
            this.showOrderConfirmationModal = true;
            console.log('Showing confirmation modal:', this.showOrderConfirmationModal);
          },
          error: (error) => {
            // If we can't get the count, still show the confirmation but with count 1
            console.error('Error getting existing orders count:', error);
            this.existingOrdersCount = 1;
            this.confirmationOrderType = orderType;
            this.showOrderConfirmationModal = true;
          }
        });
      } else {
        console.log('No existing orders found, proceeding with order');
        this.proceedWithOrder(orderType);
      }
    },
    error: (error) => {
      console.error('Error checking for existing orders:', error);
      // Show error message instead of proceeding
      this.error = 'Unable to verify existing orders. Please try again or contact support.';
    }
  });
}

// Make sure the confirmation modal is properly styled
private applyConfirmationOverlayStyles(): void {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .order-confirmation-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .order-confirmation-modal {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      z-index: 1001;
    }
    
    .confirmation-icon.warning {
      color: #ff9800;
      font-size: 3rem;
      text-align: center;
      margin-bottom: 1rem;
    }
    
    .confirmation-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 2rem;
    }
    
    .confirm-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .confirm-btn.primary {
      background-color: #4caf50;
      color: white;
      border: none;
    }
    
    .confirm-btn.secondary {
      background-color: #f5f5f5;
      color: #333;
      border: 1px solid #ddd;
    }
  `;
  document.head.appendChild(styleElement);
}


   proceedWithOrder(orderType: string): void {
  if (orderType === 'as-is') {
    this.router.navigate(['/order-as-is', this.design.designID]);
  } else if (orderType === 'similar') {
    this.router.navigate(['/request-similar', this.design.designID]);
  } else if (orderType === 'customize') {
    this.router.navigate(['/fully-customize-design', this.design.designID]);
  }
}

 // Update the handleOrderConfirmation method to use the correct path
handleOrderConfirmation(proceed: boolean): void {
  console.log('Order confirmation response:', proceed);
  this.showOrderConfirmationModal = false;
  
  if (proceed) {
    console.log('Proceeding with order type:', this.confirmationOrderType);
    this.proceedWithOrder(this.confirmationOrderType);
  } else {
    console.log('Navigating to ongoing orders');
    // Make sure this matches your actual route path 
    this.router.navigate(['/ongoing']);
  }
}

  goBack(): void {
    this.router.navigate(['/portfolio']);
  }
}
