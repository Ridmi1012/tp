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
    
    // Get token from AuthService
    const token = this.authService.getToken();
    console.log('Token being used for review submission:', token);
    
    // Set headers with authorization token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    console.log('Headers being sent:', headers);

    return this.http.post(this.apiUrl, body, { headers });
  }

  // New method to get all reviews
  getReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(this.apiUrl);
  }
}
