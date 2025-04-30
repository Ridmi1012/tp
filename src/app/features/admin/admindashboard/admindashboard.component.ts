import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-admindashboard',
  imports: [CommonModule],
  templateUrl: './admindashboard.component.html',
  styleUrl: './admindashboard.component.css'
})
export class AdmindashboardComponent {
  adminName: string = 'Admin';
  adminInitial: string = 'A';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated and is admin
    if (!this.authService.isLoggedIn() || !this.authService.isAdmin()) {
      this.router.navigate(['/unauthorized']);
      return;
    }

    // Get admin user details
    const userDetails = this.authService.getUserDetails();
    if (userDetails) {
      this.adminName = userDetails.firstName || 'Admin';
      // Get the first letter of the name for the avatar
      this.adminInitial = this.adminName.charAt(0).toUpperCase();
    }
  }

  navigateTo(route: string): void {
    // Check admin status before navigation
    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin', route]);
    } else {
      this.router.navigate(['/unauthorized']);
    }
  }
}
