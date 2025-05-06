import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TokenRefreshService {

  private apiUrl = 'http://localhost:8083/api/auth/refresh';
  private refreshingToken = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  refreshToken(): Observable<any> {
    if (this.refreshingToken) {
      return this.refreshTokenSubject.asObservable();
    }

    this.refreshingToken = true;
    this.refreshTokenSubject.next(null);

    // Get the current token
    const token = this.authService.getToken();

    if (!token) {
      this.refreshingToken = false;
      return throwError(() => new Error('No token available to refresh'));
    }

    console.log('Attempting to refresh token');
    
    return this.http.post<{token: string}>(this.apiUrl, { token })
      .pipe(
        tap(response => {
          console.log('Token refreshed successfully');
          // Store the new token
          if (response && response.token) {
            this.authService.saveToken(response.token);
            this.refreshTokenSubject.next(response.token);
          }
          this.refreshingToken = false;
        }),
        catchError(error => {
          console.error('Error refreshing token:', error);
          this.refreshingToken = false;
          // If refresh fails, log the user out
          this.authService.logout();
          return throwError(() => error);
        })
      );
  }

  isRefreshing(): boolean {
    return this.refreshingToken;
  }

  getRefreshObservable(): Observable<string | null> {
    return this.refreshTokenSubject.asObservable();
  }
}
