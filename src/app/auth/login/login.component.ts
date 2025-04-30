import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router , ActivatedRoute} from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  showPassword: boolean = false;
  forgotPasswordModalVisible: boolean = false;
  resetEmail: string = '';
  resetPasswordSuccess: boolean = false;
  returnUrl: string = '';

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Get returnUrl from query parameters
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
        console.log('Return URL captured:', this.returnUrl);
      }
    });

    // If user is already logged in, redirect appropriately
    if (this.authService.isLoggedIn()) {
      const userType = this.authService.getUserType();
      if (this.returnUrl) {
        // If there's a return URL, go there
        this.router.navigateByUrl(this.returnUrl);
      } else if (userType === 'ADMIN') {
        // Otherwise go to the appropriate dashboard
        this.router.navigate(['/admin-dashboard']);
      } else {
        this.router.navigate(['/log2book']);
      }
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  
  login() {
    // Clear previous error
    this.errorMessage = '';
    
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password';
      return;
    }
  
    this.authService.login(this.username, this.password).subscribe({
      next: (response: any) => {
        console.log('Login response:', response);
        if (response.token) { 
          // Save authentication data
          this.authService.saveToken(response.token);
          this.authService.saveUserType(response.userType);
          
          // Save user details - ensure customerId is correctly mapped
          this.authService.saveUserDetails({
            firstName: response.firstName,
            customerId: response.userId, // Make sure we use the right property
            username: this.username
          });
          
          console.log('User details saved, checking returnUrl:', this.returnUrl);
          
          // Check if there's a returnUrl to navigate to
          if (this.returnUrl) {
            console.log('Navigating to return URL:', this.returnUrl);
            // Use navigateByUrl for cleaner navigation with full paths
            this.router.navigateByUrl(this.returnUrl);
          } else {
            // Default routing based on user type
            if (response.userType === 'CUSTOMER') { 
              this.router.navigate(['/portfolio']);
            } else if (response.userType === 'ADMIN') {  
              this.router.navigate(['/admin-dashboard']); 
            }
          }
        } else {
          this.errorMessage = 'Invalid credentials';
        }
      },
      error: (err: any) => {
        console.error('Login error:', err);
        this.errorMessage = err.error?.message || 'Invalid username or password';
      }
    });
  }

  // Forgot password modal functions
  showForgotPasswordModal() {
    this.forgotPasswordModalVisible = true;
    this.resetEmail = '';
    this.resetPasswordSuccess = false;
  }

  closeForgotPasswordModal() {
    this.forgotPasswordModalVisible = false;
  }

  sendResetLink() {
    if (!this.resetEmail) {
      this.errorMessage = 'Please enter your email address';
      return;
    }

    // this.authService.forgotPassword(this.resetEmail).subscribe({
    //   next: (response: any) => {
    //     console.log('Reset password response:', response);
    //     this.resetPasswordSuccess = true;
    //     // Display success message and close modal after delay
    //     setTimeout(() => {
    //       this.closeForgotPasswordModal();
    //     }, 3000);
    //   },
    //   error: (err: any) => {
    //     console.error('Reset password error:', err);
    //     this.errorMessage = err.error?.message || 'Failed to send reset link. Please try again.';
    //   }
    // });
  }
}
