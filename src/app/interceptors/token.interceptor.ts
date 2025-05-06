import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenRefreshService } from '../services/token-refresh.service';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';


export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenRefreshService = inject(TokenRefreshService);
  const router = inject(Router);
  
  // Skip token for specific public endpoints
  if (req.url.includes('/api/auth/login') || 
      (req.url.includes('/api/customers/register') && req.method === 'POST') ||
      req.url.includes('/api/auth/refresh')) {
    return next(req);
  }
  
  // Skip for public GET endpoints
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
  
  // Add token to request if available
  const token = authService.getToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check if the error is 401 Unauthorized or 403 Forbidden due to token expiration
      if ((error.status === 401 || error.status === 403) && !req.url.includes('/api/auth/refresh')) {
        console.log(`Intercepted ${error.status} error for ${req.url}, attempting token refresh`);
        
        if (!tokenRefreshService.isRefreshing()) {
          // Try to refresh the token
          return tokenRefreshService.refreshToken().pipe(
            switchMap(response => {
              // Retry the request with the new token
              const newToken = authService.getToken(); // Get the newly saved token
              
              if (!newToken) {
                throw new Error('No token available after refresh');
              }
              
              console.log('Retrying request with new token');
              const updatedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(updatedReq);
            }),
            catchError(refreshError => {
              // If token refresh fails, redirect to login
              console.error('Token refresh failed:', refreshError);
              authService.logout();
              router.navigate(['/login'], { 
                queryParams: { returnUrl: router.url } 
              });
              return throwError(() => refreshError);
            })
          );
        } else {
          // If another request is already refreshing the token, wait for it to complete
          return tokenRefreshService.getRefreshObservable().pipe(
            switchMap(newToken => {
              if (newToken) {
                // Retry the request with the new token
                console.log('Using token from parallel refresh request');
                const updatedReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`
                  }
                });
                return next(updatedReq);
              } else {
                // If no new token, return the original error
                return throwError(() => error);
              }
            })
          );
        }
      }
      
      // For other error status codes, pass them through
      if (error.status === 405) {
        console.error('Method not allowed error:', error);
        // Give more detailed error for debugging
        return throwError(() => new Error(`Method not allowed (405) for URL: ${req.url}, method: ${req.method}`));
      }
      
      // For other errors, pass them through
      return throwError(() => error);
    })
  );
};