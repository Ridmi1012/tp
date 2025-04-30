import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Check if the user is logged in and has admin role
  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }
  
  // If user is logged in but not admin, redirect to unauthorized page
  if (authService.isLoggedIn()) {
    router.navigate(['/unauthorized']);
    return false;
  }
  
  // If not logged in, redirect to login page with return url
  router.navigate(['/login'], { 
    queryParams: { 
      returnUrl: state.url
    } 
  });
  
  return false;
};
