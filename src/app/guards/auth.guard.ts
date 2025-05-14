import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service'; 
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Check if the user is logged in
  if (!authService.isLoggedIn()) {
    // If not, redirect to login page with the return url
    router.navigate(['/login'], { 
      queryParams: { 
        returnUrl: state.url
      } 
    });
    return false;
  }
  
  // Get the required role from route data
  const requiredRole = route.data['role'];
  
  if (!requiredRole) {
    // No specific role required, just need to be logged in
    return true;
  }
  
  // Check if user has the required role
  const userType = authService.getUserType();
  
  if (requiredRole === 'CUSTOMER' && userType === 'CUSTOMER') {
    return true;
  }
  
  if (requiredRole === 'ADMIN' && userType === 'ADMIN') {
    return true;
  }
  
  // User doesn't have the required role
  if (userType === 'ADMIN' && requiredRole === 'CUSTOMER') {
    // Admin trying to access customer route
    router.navigate(['/admin']);
    return false;
  }
  
  if (userType === 'CUSTOMER' && requiredRole === 'ADMIN') {
    // Customer trying to access admin route
    router.navigate(['/unauthorized']);
    return false;
  }
  
  // Default redirect for any other case
  router.navigate(['/unauthorized']);
  return false;
};