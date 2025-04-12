import { Component, OnInit, OnDestroy  } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReviewService } from '../../services/review.service';
import { interval, Subscription } from 'rxjs';

interface Review {
  id: number;
  rating: number;
  reviewText: string;
  createdAt: string;
  customer: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  entering?: boolean;
  exiting?: boolean;
}

@Component({
  selector: 'app-reviews',
  imports: [CommonModule],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.css'
})
export class ReviewsComponent implements OnDestroy {
  reviews: Review[] = [];
  visibleReviews: Review[] = [];
  isLoading = true;
  error: string | null = null;
  currentPage = 0;
  sliderPosition = 0;
  itemsPerPage = 3; // Show 3 reviews at a time
  autoSlideInterval: Subscription | null = null;
  
  constructor(
    private reviewService: ReviewService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReviews();
    this.setResponsiveItemsPerPage();
    window.addEventListener('resize', this.setResponsiveItemsPerPage.bind(this));
  }
  
  ngOnDestroy(): void {
    if (this.autoSlideInterval) {
      this.autoSlideInterval.unsubscribe();
    }
    window.removeEventListener('resize', this.setResponsiveItemsPerPage.bind(this));
  }

  // Set the number of items per page based on screen size
  setResponsiveItemsPerPage(): void {
    if (window.innerWidth <= 768) {
      this.itemsPerPage = 1;
    } else if (window.innerWidth <= 992) {
      this.itemsPerPage = 2;
    } else {
      this.itemsPerPage = 3;
    }
    this.updateVisibleReviews();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.reviewService.getReviews().subscribe({
      next: (data) => {
        this.reviews = data;
        this.isLoading = false;
        this.updateVisibleReviews();
        this.startAutoSlide();
      },
      error: (err) => {
        console.error('Error fetching reviews:', err);
        this.error = 'Failed to load reviews. Please try again later.';
        this.isLoading = false;
      }
    });
  }
  
  // Update the visible reviews based on the current page
  updateVisibleReviews(): void {
    if (this.reviews.length === 0) return;
    
    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.reviews.length);
    
    // Get the reviews to show for the current page
    const newVisibleReviews = [];
    for (let i = startIndex; i < endIndex; i++) {
      const review = { ...this.reviews[i], entering: false, exiting: false };
      newVisibleReviews.push(review);
    }
    
    while (newVisibleReviews.length < this.itemsPerPage && this.reviews.length > 0) {
      const fillIndex: number = newVisibleReviews.length % this.reviews.length;
      const review: Review = { ...this.reviews[fillIndex], entering: false, exiting: false };
      newVisibleReviews.push(review);
    }
    
    // Apply animations
    if (this.visibleReviews.length > 0) {
      // Mark new items as entering
      newVisibleReviews.forEach(review => {
        if (!this.visibleReviews.some(v => v.id === review.id)) {
          review.entering = true;
          setTimeout(() => {
            review.entering = false;
          }, 500);
        }
      });
    }
    
    this.visibleReviews = newVisibleReviews;
  }

  // Helper method to generate star display
  getStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }
  
  // Navigation methods
  nextSlide(): void {
    this.resetAutoSlideTimer();
    if (this.currentPage < this.getPageCount().length - 1) {
      this.currentPage++;
    } else {
      this.currentPage = 0;
    }
    this.updateVisibleReviews();
  }

  prevSlide(): void {
    this.resetAutoSlideTimer();
    if (this.currentPage > 0) {
      this.currentPage--;
    } else {
      this.currentPage = this.getPageCount().length - 1;
    }
    this.updateVisibleReviews();
  }
  
  goToPage(pageIndex: number): void {
    this.resetAutoSlideTimer();
    this.currentPage = pageIndex;
    this.updateVisibleReviews();
  }
  
  // Calculate how many pages of reviews we have
  getPageCount(): number[] {
    const pageCount = Math.ceil(this.reviews.length / this.itemsPerPage);
    return Array(pageCount).fill(0).map((_, i) => i);
  }

  // Start auto-sliding
  startAutoSlide(): void {
    // Clear any existing interval
    if (this.autoSlideInterval) {
      this.autoSlideInterval.unsubscribe();
    }
    
    // Only start if we have more than one page
    if (this.getPageCount().length > 1) {
      this.autoSlideInterval = interval(5000).subscribe(() => {
        this.nextSlide();
      });
    }
  }

  // Reset the auto-slide timer when user interacts with controls
  resetAutoSlideTimer(): void {
    if (this.autoSlideInterval) {
      this.autoSlideInterval.unsubscribe();
    }
    this.startAutoSlide();
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
