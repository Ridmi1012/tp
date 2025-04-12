import { Component, ViewChild, ElementRef } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent {

  username: string = '';
  password: string = '';
  errorMessage: string = '';
  showPassword: boolean = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  
  constructor(private authService: AuthService, private router: Router) { }

  login() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password';
      return;
    }

    this.authService.login(this.username, this.password).subscribe({
      next: (response: any) => {
        console.log('Login response:', response); // Add logging
        if (response.token) { 
          console.log('Saving token:', response.token); // Add logging
          this.authService.saveToken(response.token); 

          if (response.userType === 'CUSTOMER') { 
            this.router.navigate(['/log2book']);
          } else if (response.userType === 'ADMIN') {  
            this.router.navigate(['/log2book']);
          }
        } else {
          this.errorMessage = 'Invalid credentials';
        }
      },
      error: (err) => {
        console.error('Login error:', err); // Add logging
        this.errorMessage = err.error?.message || 'Invalid username or password';
      }
    });
  }
}
