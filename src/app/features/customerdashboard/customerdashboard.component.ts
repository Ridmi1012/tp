import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customerdashboard',
  imports: [],
  templateUrl: './customerdashboard.component.html',
  styleUrl: './customerdashboard.component.css'
})
export class CustomerdashboardComponent {

 constructor(private authService: AuthService, private router: Router) { }

  goToBookingForm(): void {
    this.router.navigate(['/booking-form']); // Adjust to your routing path for booking form
  }

  goToReviewForm(): void {
    this.router.navigate(['/review-form']); // Adjust to your routing path for review form
  }

}
