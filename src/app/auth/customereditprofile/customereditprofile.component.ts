import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CustomerService } from '../../services/customer.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customereditprofile',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './customereditprofile.component.html',
  styleUrl: './customereditprofile.component.css'
})
export class CustomereditprofileComponent implements OnInit {
  
  customer: any = {
    customerId: '',
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    contact: ''
  };
  successMessage: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private customerService: CustomerService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCustomerData();
  }

  loadCustomerData(): void {
    this.isLoading = true;
    const userDetails = this.authService.getUserDetails();
    
    if (userDetails && userDetails.userId) {
      this.customerService.getCustomerById(userDetails.userId).subscribe({
        next: (data) => {
          this.customer = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching customer data', error);
          this.errorMessage = 'Failed to load your profile information. Please try again later.';
          this.isLoading = false;
        }
      });
    } else {
      this.errorMessage = 'You need to be logged in to view this page';
      this.router.navigate(['/login']);
    }
  }

  updateProfile(): void {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.customerService.updateCustomer(this.customer).subscribe({
      next: (response) => {
        this.successMessage = 'Profile updated successfully!';
        this.isLoading = false;
        
        // Update stored user details
        const userDetails = this.authService.getUserDetails();
        if (userDetails) {
          userDetails.firstName = this.customer.firstName;
          this.authService.saveUserDetails(userDetails);
        }
      },
      error: (error) => {
        console.error('Error updating profile', error);
        this.errorMessage = 'Failed to update profile. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  cancelEdit(): void {
    this.router.navigate(['/log2book']);
  }

}
