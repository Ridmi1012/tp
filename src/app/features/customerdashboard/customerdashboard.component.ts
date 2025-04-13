import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customerdashboard',
  imports: [],
  templateUrl: './customerdashboard.component.html',
  styleUrl: './customerdashboard.component.css'
})
export class CustomerdashboardComponent implements OnInit{

  firstname: string = '';
  avatarLetter: string = '';

  constructor(private authService: AuthService, private router: Router) { }


  ngOnInit() {
    const userDetails = this.authService.getUserDetails();
    if (userDetails) {
      this.firstname = userDetails.firstName;
      this.avatarLetter = this.firstname.charAt(0).toUpperCase();
    }
  }

  goToBookingForm(): void {
    this.router.navigate(['/booking-form']);
  }

  goToReviewForm(): void {
    this.router.navigate(['/review-form']);
  }

}
