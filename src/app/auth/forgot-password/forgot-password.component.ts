import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}
  
  /**
   * NEW METHOD - Initialize component
   */
  ngOnInit(): void {
    this.initForm();
  }
  
  /**
   * NEW METHOD - Initialize form
   */
  initForm(): void {
    this.forgotPasswordForm = this.fb.group({
      username: ['', [Validators.required]]
    });
  }
  
  /**
   * NEW METHOD - Check if field is invalid
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return field !== null && field.invalid && (field.dirty || field.touched);
  }
  
  /**
   * NEW METHOD - Submit forgot password request
   */
  submitRequest(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    const username = this.forgotPasswordForm.value.username;
    
    this.authService.requestPasswordReset(username).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Password reset instructions have been sent!';
        
        // In development, we're showing the token
        // In production, this should be sent via email
        if (response.token) {
          console.log('Reset token:', response.token);
          // For testing, navigate to reset page with token
          setTimeout(() => {
            this.router.navigate(['/reset-password'], { 
              queryParams: { token: response.token } 
            });
          }, 2000);
        }
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 404) {
          this.errorMessage = 'User not found';
        } else {
          this.errorMessage = 'An error occurred. Please try again later.';
        }
        console.error('Forgot password error:', error);
      }
    });
  }
  
  /**
   * NEW METHOD - Navigate back to login
   */
  backToLogin(): void {
    this.router.navigate(['/login']);
  }

}
