import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service'; 
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Check if the user is logged in
  if (authService.isLoggedIn()) {
    return true;
  }
  
  // If not, redirect to login page with the return url
  router.navigate(['/login'], { 
    queryParams: { 
      returnUrl: state.url
    } 
  });
  
  return false;
};