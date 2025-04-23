import { FormsModule } from '@angular/forms';
import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

declare var atlas: any;

@Component({
  selector: 'app-bookingform',
  imports: [FormsModule, CommonModule],
  templateUrl: './bookingform.component.html',
  styleUrls: ['./bookingform.component.css']
})
export class BookingFormComponent {
  form = {
    fullName: '',
    email: '',
    phone: '',
    backdropTheme: '',
    primaryColor: '#f47a7a',  // Updated to match theme
    secondaryColor: '#f9b4b4', // Updated to match theme
    tertiaryColor: '#fde2e2',  // Updated to match theme
    character: '',
    table: false,
    cakeStand: false,
    backdropCount: 1,
    customText: '',
    eventType: '',
    otherEventType: '',
    celebrationYear: null,
    eventDateTime: null,
    venue: '',
    location: '',
    indoorOutdoor: '',
    lighting: false,
    letters: '',
    addons: [] as string[], // Fixed by explicitly typing as string array
    budget: '',
    payment: '',
    terms: false,
    notes: ''
  };

  showYearField = false;
  currentStep = 0;
  file: File | null = null;
  
  // Available add-ons for selection
  availableAddons = [
    'Green Carpet',
    'Artificial Grass',
    'Flowers',
    'Gift Table',
    'Photo Props',
    'Balloon Arch'
  ];

  steps = [
    { title: 'Customer Details', sub: 'Tell us about yourself' },
    { title: 'Event Details', sub: 'Let us know the event specifics' },
    { title: 'Backdrop Selection', sub: 'Design your perfect backdrop' },
    { title: 'Add-ons', sub: 'Want anything extra?' },
    { title: 'Upload', sub: 'Add references (optional)' },
    { title: 'Budget & Payment', sub: 'Final steps!' },
    { title: 'Confirmation', sub: 'Almost done!' }
  ];

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      // Simple validation for each step before proceeding
      if (this.validateCurrentStep()) {
        this.currentStep++;
        window.scrollTo(0, 0); // Scroll to top for new step
      }
    }
  }

  validateCurrentStep(): boolean {
    // Add basic validation logic for each step
    switch (this.currentStep) {
      case 0: // Customer Details
        return !!this.form.fullName && !!this.form.email && !!this.form.phone;
      case 1: // Event Details
        return !!this.form.eventType && !!this.form.eventDateTime;
      default:
        return true; // No validation for other steps in this example
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      window.scrollTo(0, 0); // Scroll to top for new step
    }
  }

  onFileSelected(event: any) {
    this.file = event.target.files[0];
  }

  removeFile(event: Event) {
    event.stopPropagation(); // Prevent triggering the file input
    this.file = null;
  }

  checkYearField() {
    const yearBased = ['Birthday Party', 'Anniversary'];
    this.showYearField = yearBased.includes(this.form.eventType);
  }

  onOtherEventTypeChange() {
    if (this.form.eventType === 'Other' && !this.form.otherEventType) {
      // Custom logic for empty "Other" input
      console.log('Custom event type is empty');
    } else {
      console.log('Custom event type:', this.form.otherEventType);
    }
  }

  toggleAddon(addon: string) {
    const index = this.form.addons.indexOf(addon);
    if (index === -1) {
      this.form.addons.push(addon);
    } else {
      this.form.addons.splice(index, 1);
    }
  }

  onSubmit() {
    if (this.validateCurrentStep()) {
      console.log('Form submitted:', this.form);
      // Here you would typically send the data to your backend
      alert('Booking submitted successfully! We will contact you shortly.');
    } else {
      alert('Please fill in all required fields');
    }
  }
}