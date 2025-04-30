import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip token for login and register requests
  if (req.url.includes('/api/auth/login') || 
      (req.url.includes('/api/customers') && req.method === 'POST')) {
    return next(req);
  }
  
  // Skip for public endpoints like getting designs, categories, items, and reviews when reading
  if (req.method === 'GET' && (
      req.url.includes('/api/designs') || 
      req.url.includes('/api/categories') || 
      req.url.includes('/api/items') ||
      req.url.includes('/api/reviews')
    )) {
    return next(req);
  }
  
  // Skip if requests to Cloudinary (we handle these separately)
  if (req.url.includes('cloudinary.com')) {
    // Let it pass as is - the service handles its own headers
    return next(req);
  }
  
  // Skip if the request already has Authorization header (avoid double-handling)
  if (req.headers.has('Authorization')) {
    return next(req);
  }
  
  // For non-GET methods to /api/items, /api/categories, and /api/designs, always require admin authentication

  // Get token from storage
  const token = authService.getToken();
  
  if (token) {
    // Clone the request and add the token
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return next(authReq).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401 || error.status === 403) {
            console.log('Authentication error:', error);
            authService.logout();
            router.navigate(['/login'], { 
              queryParams: { returnUrl: router.url }
            });
          }
        }
        return throwError(() => error);
      })
    );
  }

  // If no token and endpoint requires auth, redirect to login
  if (!isPublicEndpoint(req)) {
    console.log('Authentication required for:', req.url);
    router.navigate(['/login'], { 
      queryParams: { returnUrl: router.url }
    });
    return throwError(() => new HttpErrorResponse({
      error: 'Authentication required',
      status: 401,
      statusText: 'Unauthorized'
    }));
  }

  return next(req);
};

// Helper function to determine if an endpoint is public
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
  
  // Login and register endpoints are public
  if (req.url.includes('/api/auth/login') || 
    (req.url.includes('/api/customers') && req.method === 'POST')) {
    return true;
  }
  
  // Cloudinary requests are handled separately
  if (req.url.includes('cloudinary.com')) {
    return true;
  }
  
  return false;
}
// This interceptor handles authentication by adding the token to requests and redirecting to login on 401/403 errors.