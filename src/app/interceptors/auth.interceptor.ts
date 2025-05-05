import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip token for login and register requests
  if (req.url.includes('/api/auth/login') || 
      (req.url.includes('/api/customers/register') && req.method === 'POST')) {
    return next(req);
  }
  
  // Skip for public endpoints when reading
  if (req.method === 'GET' && (
      req.url.includes('/api/designs') || 
      req.url.includes('/api/categories') || 
      req.url.includes('/api/items') ||
      req.url.includes('/api/reviews')
    )) {
    return next(req);
  }
  
  // Skip Cloudinary requests
  if (req.url.includes('cloudinary.com')) {
    return next(req);
  }
  
  // Get token from storage
  const token = authService.getToken();
  
  if (token) {
    // Clone the request and add the token
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Sending request with token to:', req.url);
    
    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Request error:', error);
        
        if (error.status === 403) {
          console.log('Access forbidden error for URL:', req.url);
          
          // If trying to access admin routes but not admin
          if (req.url.includes('/api/admin/') || req.url.includes('/api/orders')) {
            if (!authService.isAdmin()) {
              console.log('User attempting to access admin resources without admin role');
              router.navigate(['/unauthorized']);
            } else {
              console.log('Admin token may be invalid - logging out');
              authService.logout();
              router.navigate(['/login']);
            }
          } else {
            // Handle other 403 errors
            console.log('Authentication error - logging out');
            authService.logout();
            router.navigate(['/login']);
          }
        } else if (error.status === 401) {
          console.log('Authentication error - logging out');
          authService.logout();
          router.navigate(['/login'], { 
            queryParams: { returnUrl: router.url }
          });
        }
        
        return throwError(() => error);
      })
    );
  } else {
    console.log('No token found for request to:', req.url);
    
    // If no token and endpoint requires auth, redirect to login
    if (!isPublicEndpoint(req)) {
      router.navigate(['/login'], { 
        queryParams: { returnUrl: router.url }
      });
      return throwError(() => new HttpErrorResponse({
        error: 'Authentication required',
        status: 401,
        statusText: 'Unauthorized'
      }));
    }
  }

  return next(req);
};

function isPublicEndpoint(req: HttpRequest<unknown>): boolean {
  // GET requests to these endpoints are public
  if (req.method === 'GET' && (
    req.url.includes('/api/designs') || 
    req.url.includes('/api/categories') || 
    req.url.includes('/api/items') ||
    req.url.includes('/api/reviews')
  )) {
    return true;
  }
  
  // Auth endpoints are public
  if (req.url.includes('/api/auth/login') || 
      req.url.includes('/api/customers/register')) {
    return true;
  }
  
  return false;
}
