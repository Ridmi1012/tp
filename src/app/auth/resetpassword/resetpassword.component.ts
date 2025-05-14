import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators , ReactiveFormsModule} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common'; 
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-resetpassword',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './resetpassword.component.html',
  styleUrl: './resetpassword.component.css'
})
export class ResetpasswordComponent implements OnInit{
  resetPasswordForm!: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  token: string = '';
  tokenValid = false;
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}
  
  /**
   * NEW METHOD - Initialize component
   */
  ngOnInit(): void {
    // Get token from query parameters
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (this.token) {
        this.validateToken();
      } else {
        this.errorMessage = 'No reset token provided';
      }
    });
    
    this.initForm();
  }
  
  /**
   * NEW METHOD - Initialize form
   */
  initForm(): void {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/.*[0-9].*/) // Requires at least one number
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }
  
  /**
   * NEW METHOD - Validate password match
   */
  passwordMatchValidator(form: FormGroup): { passwordMismatch: boolean } | null {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }
  
  /**
   * NEW METHOD - Check if field is invalid
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetPasswordForm.get(fieldName);
    return field !== null && field.invalid && (field.dirty || field.touched);
  }
  
  /**
   * NEW METHOD - Validate reset token
   */
  validateToken(): void {
    this.isLoading = true;
    
    this.authService.validateResetToken(this.token).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.tokenValid = response.isValid;
        if (!this.tokenValid) {
          this.errorMessage = 'Invalid or expired reset token';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error validating token';
        console.error('Token validation error:', error);
      }
    });
  }
  
  /**
   * NEW METHOD - Reset password
   */
  resetPassword(): void {
    if (this.resetPasswordForm.invalid || !this.tokenValid) {
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    const newPassword = this.resetPasswordForm.value.newPassword;
    
    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Password reset successfully!';
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 400) {
          this.errorMessage = 'Invalid or expired reset token';
        } else {
          this.errorMessage = 'An error occurred. Please try again later.';
        }
        console.error('Password reset error:', error);
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
