import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service'; // Import AuthService

interface Review {
  id: number;
  rating: number;
  reviewText: string;
  createdAt: string;
  customer: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

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
    const headers = this.getAuthHeaders();
    return this.http.post(this.apiUrl, body, { headers });
  }

  // Get all reviews - this is a public endpoint that doesn't require authentication
  getReviews(): Observable<Review[]> {
    // For GET requests to the reviews endpoint, we don't need authentication
    // as we've updated the backend security config to allow public access
    return this.http.get<Review[]>(this.apiUrl);
  }

  // Helper method to get auth headers
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
}