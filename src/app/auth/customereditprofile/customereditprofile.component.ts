import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CustomerService, Customer } from '../../services/customer.service';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';


interface CustomerApiResponse {
  customerId?: number | string;
  id?: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  contact?: string;
  phone?: string;
  address?: string;
}

@Component({
  selector: 'app-customereditprofile',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './customereditprofile.component.html',
  styleUrl: './customereditprofile.component.css'
})
export class CustomereditprofileComponent implements OnInit {
customerId: string = '';
  
  customer: Customer = {
    customerId: 0,
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    contact: '',
    address: ''
  };
  
  successMessage: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private customerService: CustomerService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get customerId from route parameters
    this.route.params.subscribe(params => {
      this.customerId = params['customerId'];
      this.loadCustomerData();
    });
  }

  loadCustomerData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Use customerId from route if available, otherwise use logged-in user's ID
    let customerIdToLoad = this.customerId;
    
    if (!customerIdToLoad) {
      const userDetails = this.authService.getUserDetails();
      if (userDetails && userDetails.userId) {
        customerIdToLoad = userDetails.userId;
      }
    }
    
    if (customerIdToLoad) {
      this.customerService.getCustomerById(customerIdToLoad).subscribe({
        next: (data: Customer) => {
          // Directly assign the customer data
          this.customer = {
            customerId: data.customerId,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            username: data.username || '',
            contact: data.contact || '',
            address: data.address || ''
          };
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
      this.isLoading = false;
      this.router.navigate(['/login']);
    }
  }

  updateProfile(): void {
    if (!this.customer.customerId) {
      this.errorMessage = 'Customer ID is missing';
      return;
    }

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
          userDetails.lastName = this.customer.lastName;
          userDetails.email = this.customer.email;
          this.authService.saveUserDetails(userDetails);
        }
        
        // Navigate after a short delay
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error updating profile', error);
        this.errorMessage = error.error?.message || 'Failed to update profile. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  cancelEdit(): void {
    this.router.navigate(['/home']);
  }

}
