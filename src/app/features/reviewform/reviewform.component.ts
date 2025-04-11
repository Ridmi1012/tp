import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

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
  selectedFiles: File[] = [];
  isSubmitting: boolean = false;
  isSubmitted: boolean = false;
  
  ratingDescriptions = [
    '',
    'Poor - Did not meet expectations',
    'Fair - Below average experience',
    'Good - Met expectations',
    'Very Good - Above average experience',
    'Excellent - Exceeded all expectations'
  ];

  constructor(private fb: FormBuilder) { }

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

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      this.selectedFiles = Array.from(files);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.reviewForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  submitReview(): void {
    if (this.reviewForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.reviewForm.controls).forEach(field => {
        const control = this.reviewForm.get(field);
        control?.markAsTouched({ onlySelf: true });
      });
      return;
    }

    this.isSubmitting = true;

    // Simulate API call
    setTimeout(() => {
      console.log('Form submitted:', this.reviewForm.value);
      console.log('Files:', this.selectedFiles);
      
      this.isSubmitting = false;
      this.isSubmitted = true;
      
      // Reset form after submission
      this.reviewForm.reset();
      this.rating = 0;
      this.selectedFiles = [];
    }, 1500);
  }
}
