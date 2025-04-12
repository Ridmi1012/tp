import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service'; // Import AuthService

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'http://localhost:8083/api/reviews';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  submitReview(rating: number, review: string): Observable<any> {
    const body = { rating, review };
    
    // Get token from AuthService
    const token = this.authService.getToken();
    console.log('Token being used for review submission:', token); // Add logging
    
    // Set headers with authorization token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    console.log('Headers being sent:', headers); // Add logging

    return this.http.post(this.apiUrl, body, { headers });
  }
}
