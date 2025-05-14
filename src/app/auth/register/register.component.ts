import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

   registerForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
  
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      // MODIFIED: Changed phone pattern to exactly 10 digits
      contact: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      // MODIFIED: Changed password minimum length from 6 to 8
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, {
      // MODIFIED: Added multiple validators
      validators: [this.passwordMatchValidator, this.usernamePasswordDifferentValidator]
    });
  }

  // Custom validator to check if password and confirmPassword match
  passwordMatchValidator(form: FormGroup): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  // NEW: Custom validator to check if username is different from password
  usernamePasswordDifferentValidator(form: FormGroup): ValidationErrors | null {
    const username = form.get('username')?.value;
    const password = form.get('password')?.value;
    
    // Case-insensitive comparison after trimming
    if (username && password && username.trim().toLowerCase() === password.toLowerCase()) {
      form.get('password')?.setErrors({ sameAsUsername: true });
      return { sameAsUsername: true };
    }
    
    return null;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // NEW: Trim all form values before submission and convert email to lowercase
    const formData = {
      ...this.registerForm.value,
      firstName: this.registerForm.value.firstName.trim(),
      lastName: this.registerForm.value.lastName.trim(),
      contact: this.registerForm.value.contact.trim(),
      email: this.registerForm.value.email.trim().toLowerCase(), // MODIFIED: Convert email to lowercase
      username: this.registerForm.value.username.trim()
      // Don't trim password as spaces might be intentional
    };

    this.authService.register(formData).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        this.isSubmitting = false;
        this.registerForm.reset();
        alert('Registration successful! Please login.');
        this.router.navigate(['/login']);  
      },
      error: (err) => {
        console.error('Registration error:', err);
        this.isSubmitting = false;
        // MODIFIED: Better error handling for validation errors
        if (err.error && typeof err.error === 'string') {
          this.errorMessage = err.error;
        } else {
          this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
        }
      }
    });
  }
}
