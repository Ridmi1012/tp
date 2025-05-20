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
      this.router.navigate(['/fully-customize-design', this.design.designID]);
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

   // NEW METHOD - Check for existing orders
  private checkExistingOrders(orderType: string): void {
    const userDetails = this.authService.getUserDetails();
    const customerId = userDetails?.customerId?.toString();
    
    if (!customerId || !this.design) {
      // If no customer ID or design, proceed normally
      this.proceedWithOrder(orderType);
      return;
    }

    this.orderService.checkOngoingOrderForDesign(customerId, this.design.designID.toString()).subscribe({
      next: (hasOngoingOrder) => {
        if (hasOngoingOrder) {
          // Get the count of existing orders
          this.orderService.getOngoingOrdersForDesign(customerId, this.design.designID.toString()).subscribe({
            next: (orders) => {
              this.existingOrdersCount = orders.length;
              this.confirmationOrderType = orderType;
              this.showOrderConfirmationModal = true;
            },
            error: (error) => {
              console.error('Error getting ongoing orders count:', error);
              // On error, proceed normally
              this.proceedWithOrder(orderType);
            }
          });
        } else {
          // No ongoing orders, proceed normally
          this.proceedWithOrder(orderType);
        }
      },
      error: (error) => {
        console.error('Error checking for existing orders:', error);
        // On error, proceed normally
        this.proceedWithOrder(orderType);
      }
    });
  }

   // NEW METHOD - Proceed with order after confirmation
  proceedWithOrder(orderType: string): void {
    if (orderType === 'as-is') {
      this.router.navigate(['/order-as-is', this.design.designID]);
    } else if (orderType === 'similar') {
      this.router.navigate(['/request-similar', this.design.designID]);
    }
  }

  // NEW METHOD - Handle confirmation modal response
  handleOrderConfirmation(proceed: boolean): void {
    this.showOrderConfirmationModal = false;
    
    if (proceed) {
      this.proceedWithOrder(this.confirmationOrderType);
    } else {
      // Navigate to ongoing orders
      this.router.navigate(['/ongoing-orders']);
    }
  }

  goBack(): void {
    this.router.navigate(['/portfolio']);
  }
}
