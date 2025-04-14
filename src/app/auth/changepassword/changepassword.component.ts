import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CustomerService } from '../../services/customer.service';
import { CommonModule } from '@angular/common';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-changepassword',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './changepassword.component.html',
  styleUrl: './changepassword.component.css'
})
export class ChangepasswordComponent implements OnInit{
  passwordForm!: FormGroup; // The ! tells TypeScript that this will be initialized before use
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  currentUser: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private customerService: CustomerService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.checkUserLoggedIn();
    this.initForm();
  }

  checkUserLoggedIn(): void {
    if (!this.authService.isLoggedIn() || !this.authService.isCustomer()) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = this.authService.getUserDetails();
  }

  initForm(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/.*[0-9].*/) // Requires at least one number
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup): { passwordMismatch: boolean } | null {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return field !== null && field.invalid && (field.dirty || field.touched);
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const passwordData = {
      username: this.currentUser.username,
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword
    };

    this.customerService.changePassword(passwordData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Password successfully updated!';
        this.passwordForm.reset();
        
        // Navigate back to profile page after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/log2book']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.errorMessage = 'Current password is incorrect';
        } else {
          this.errorMessage = 'An error occurred. Please try again later.';
        }
        console.error('Password change error:', error);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/log2book']);
  }

}
