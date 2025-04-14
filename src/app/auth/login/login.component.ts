import { Component, ViewChild, ElementRef } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  constructor(private authService: AuthService, private router: Router) { }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  
  login() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password';
      return;
    }
  
    this.authService.login(this.username, this.password).subscribe({
      next: (response: any) => {
        console.log('Login response:', response);
        if (response.token) { 
          this.authService.saveToken(response.token);
          localStorage.setItem('userType', response.userType);
          
          // Save user details
          this.authService.saveUserDetails({
            firstName: response.firstName,
            userId: response.userId,
            username: this.username
          });
          
          // Route based on user type
          if (response.userType === 'CUSTOMER') { 
            this.router.navigate(['/log2book']);
          } else if (response.userType === 'ADMIN') {  
            this.router.navigate(['/admin-dashboard']); 
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

    this.authService.forgotPassword(this.resetEmail).subscribe({
      next: (response: any) => {
        console.log('Reset password response:', response);
        this.resetPasswordSuccess = true;
        // Display success message and close modal after delay
        setTimeout(() => {
          this.closeForgotPasswordModal();
        }, 3000);
      },
      error: (err: any) => {
        console.error('Reset password error:', err);
        this.errorMessage = err.error?.message || 'Failed to send reset link. Please try again.';
      }
    });
  }

}
