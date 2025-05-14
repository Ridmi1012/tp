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
  verificationForm!: FormGroup;
  resetPasswordForm!: FormGroup;
  
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  
  // NEW: Step management
  currentStep: 'username' | 'verify' | 'reset' = 'username';
  username = '';
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.initForms();
  }
  
  /**
   * CHANGED: Initialize all forms
   */
  initForms(): void {
    this.forgotPasswordForm = this.fb.group({
      username: ['', [Validators.required]]
    });
    
    // NEW: Verification form
    this.verificationForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
    
    // NEW: Reset password form
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }
  
  /**
   * NEW: Password match validator
   */
  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('newPassword');
    const confirmPassword = formGroup.get('confirmPassword');
    
    if (password && confirmPassword) {
      const isMatching = password.value === confirmPassword.value;
      return isMatching ? null : { passwordMismatch: true };
    }
    return null;
  }
  
  isFieldInvalid(fieldName: string): boolean {
    let form;
    switch (this.currentStep) {
      case 'username':
        form = this.forgotPasswordForm;
        break;
      case 'verify':
        form = this.verificationForm;
        break;
      case 'reset':
        form = this.resetPasswordForm;
        break;
    }
    
    const field = form.get(fieldName);
    return field !== null && field.invalid && (field.dirty || field.touched);
  }
  
  /**
   * CHANGED: Now sends email instead of generating token
   */
  submitRequest(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    this.username = this.forgotPasswordForm.value.username;
    
    this.authService.requestPasswordReset(this.username).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Verification code has been sent to your email!';
        
        // Move to verification step
        setTimeout(() => {
          this.currentStep = 'verify';
          this.successMessage = '';
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 404) {
          this.errorMessage = 'User not found or email not available';
        } else {
          this.errorMessage = 'An error occurred. Please try again later.';
        }
        console.error('Forgot password error:', error);
      }
    });
  }
  
  /**
   * NEW METHOD - Verify the code
   */
  verifyCode(): void {
    if (this.verificationForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const code = this.verificationForm.value.code;
    
    this.authService.verifyResetCode(this.username, code).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Code verified successfully!';
        
        // Move to reset password step
        setTimeout(() => {
          this.currentStep = 'reset';
          this.successMessage = '';
        }, 1000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Invalid or expired code. Please try again.';
        console.error('Code verification error:', error);
      }
    });
  }
  
  /**
   * NEW METHOD - Reset password with code
   */
  resetPassword(): void {
    if (this.resetPasswordForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const newPassword = this.resetPasswordForm.value.newPassword;
    const code = this.verificationForm.value.code;
    
    this.authService.resetPasswordWithCode(this.username, code, newPassword).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Password reset successfully! Redirecting to login...';
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error resetting password. Please try again.';
        console.error('Password reset error:', error);
      }
    });
  }
  
  /**
   * NEW METHOD - Resend verification code
   */
  resendCode(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.requestPasswordReset(this.username).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'New verification code has been sent!';
        this.verificationForm.reset();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error sending new code. Please try again.';
      }
    });
  }
  
  backToLogin(): void {
    this.router.navigate(['/login']);
  }
  
  /**
   * NEW METHOD - Go back to previous step
   */
  goBack(): void {
    if (this.currentStep === 'verify') {
      this.currentStep = 'username';
    } else if (this.currentStep === 'reset') {
      this.currentStep = 'verify';
    }
    this.errorMessage = '';
    this.successMessage = '';
  }
}
