import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DesignService } from '../../../services/design.service';
import { Design } from '../../../services/design.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
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

  constructor(
    private designService: DesignService,
    private route: ActivatedRoute,
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

  orderAsIs(): void {
    // Check if the user is logged in
    const isLoggedIn = this.authService.isLoggedIn();
    console.log('User logged in status:', isLoggedIn);
    
    if (isLoggedIn) {
      // If logged in, navigate directly to the order page
      this.router.navigate(['/order-as-is', this.design.designID]);
    } else {
      // If not logged in, redirect to login with return URL
      console.log('User not logged in, redirecting to login with returnUrl');
      const returnUrl = `/order-as-is/${this.design.designID}`;
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl }
      });
    }
  }

  customizeDesign(): void {
    // Check login status for customize design too
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/customize', this.design.designID]);
    } else {
      const returnUrl = `/customize/${this.design.designID}`;
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl }
      });
    }
  }

  requestSimilarDesign(): void {
    // Check login status for similar design request too
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/customize', this.design.designID, 'similar']);
    } else {
      const returnUrl = `/customize/${this.design.designID}/similar`;
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/portfolio']);
  }
}
