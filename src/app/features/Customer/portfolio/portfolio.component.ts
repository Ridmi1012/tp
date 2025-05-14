import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DesignService } from '../../../services/design.service';
import { CategoryService } from '../../../services/category.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Design } from '../../../services/design.service';
import { Category } from '../../../services/category.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-portfolio',
  imports: [CommonModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css'
})
export class PortfolioComponent  {
  designs: Design[] = [];
  categories: Category[] = [];
  selectedCategoryId: number | null = null;
  errorMessage: string = '';
  showLoginRedirectOverlay = false;
   
  constructor(
    private designService: DesignService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    
    // Check if category is specified in the route
    this.route.params.subscribe(params => {
      if (params['categoryId']) {
        this.selectedCategoryId = +params['categoryId'];
        this.loadDesignsByCategory(this.selectedCategoryId);
      } else {
        this.loadAllDesigns();
      }
    });
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (data: Category[]) => {
        this.categories = data;
      },
      error: (err: any) => {
        console.error('Error loading categories', err);
        this.errorMessage = 'Failed to load categories. Please try again.';
      }
    });
  }

  loadAllDesigns() {
    this.designService.getAllDesigns().subscribe({
      next: (data: Design[]) => {
        this.designs = data;
        this.selectedCategoryId = null;
        this.errorMessage = '';
      },
      error: (err: any) => {
        console.error('Error loading designs', err);
        this.errorMessage = 'Failed to load designs. Please try again.';
      }
    });
  }

  loadDesignsByCategory(categoryId: number) {
    this.designService.getDesignsByCategory(categoryId).subscribe({
      next: (data: Design[]) => {
        this.designs = data;
        this.selectedCategoryId = categoryId;
        this.errorMessage = '';
      },
      error: (err: any) => {
        console.error('Error loading designs by category', err);
        this.errorMessage = 'Failed to load designs for this category. Please try again.';
      }
    });
  }

  onCategoryChange(categoryId: number | null) {
    if (categoryId === null) {
      this.loadAllDesigns();
      this.router.navigate(['/portfolio']);
    } else {
      this.loadDesignsByCategory(categoryId);
      this.router.navigate(['/portfolio', 'category', categoryId]);
    }
  }

  onImageError(event: any): void {
    event.target.src = '/assets/placeholder-image.png';
  }

  viewDesignDetails(designId: number) {
    this.router.navigate(['/design-details', designId]);
  }

  requestCustomization(designId: number) {
    this.router.navigate(['/design-details', designId]);
  }

  private redirectToLogin(returnUrl: string): void {
    this.showLoginRedirectOverlay = true;
    setTimeout(() => {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl }
      });
    }, 2000); // Show message for 2 seconds before redirecting
  }

  requestNewDesign() {
    // Check if the user is logged in
    const isLoggedIn = this.authService.isLoggedIn();
    console.log('User logged in status:', isLoggedIn);
    
    if (isLoggedIn) {
      // If logged in, navigate directly to request new design page
      this.router.navigate(['/request-new-design']);
    } else {
      // If not logged in, show overlay message then redirect to login
      console.log('User not logged in, showing message then redirecting to login');
      const returnUrl = '/request-new-design';
      this.redirectToLogin(returnUrl);
    }
  }
}
