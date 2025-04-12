import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReviewService } from '../../services/review.service';


@Component({
  selector: 'app-reviewform',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './reviewform.component.html',
  styleUrl: './reviewform.component.css'
})

export class ReviewFormComponent implements OnInit {
  reviewForm!: FormGroup;
  rating: number = 0;
  hoverRating: number = 0;
  isSubmitting: boolean = false;
  isSubmitted: boolean = false;
  showSuccessOverlay: boolean = false;

  ratingDescriptions = [
    '',
    'Poor - Did not meet expectations',
    'Fair - Below average experience',
    'Good - Met expectations',
    'Very Good - Above average experience',
    'Excellent - Exceeded all expectations'
  ];

  constructor(
    private fb: FormBuilder,
    private reviewService: ReviewService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.reviewForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1)]],
      review: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  setRating(value: number): void {
    this.rating = value;
    this.reviewForm.patchValue({ rating: value });
  }

  getRatingText(): string {
    return this.hoverRating > 0
      ? this.ratingDescriptions[this.hoverRating]
      : this.rating > 0
        ? this.ratingDescriptions[this.rating]
        : 'Click to rate';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.reviewForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  submitReview(): void {
    if (this.reviewForm.invalid) {
      Object.keys(this.reviewForm.controls).forEach(field => {
        const control = this.reviewForm.get(field);
        control?.markAsTouched({ onlySelf: true });
      });
      return;
    }
  
    // Check if user is logged in first
    if (!this.authService.isLoggedIn()) {
      alert('You must be logged in to submit a review');
      this.router.navigate(['/login']);
      return;
    }
  
    this.isSubmitting = true;
    const { rating, review } = this.reviewForm.value;
    
    console.log('Submitting review:', { rating, review });
    console.log('Auth token:', this.authService.getToken());
  
    this.reviewService.submitReview(rating, review).subscribe({
      next: (response) => {
        console.log('Review submitted successfully:', response);
        this.isSubmitting = false;
        this.isSubmitted = true;
        this.showSuccessOverlay = true;
  
        // Show the success message for 2.5 seconds, then navigate
        setTimeout(() => {
          this.router.navigate(['/reviews']);
        }, 2500);
  
        this.reviewForm.reset();
        this.rating = 0;
      },
      error: (error) => {
        console.error('Error submitting review:', error);
        this.isSubmitting = false;
        
        if (error.status === 401) {
          alert('Your session has expired. Please login again.');
          this.router.navigate(['/login']);
        } else {
          alert(`Failed to submit review: ${error.error || 'Please try again later.'}`);
        }
      }
    });
  }
}