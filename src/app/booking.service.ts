import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookingService {

  private apiUrl = 'http://localhost:8080/api/bookings'; // Adjust if needed

  constructor(private http: HttpClient) {}

  submitBooking(formData: any): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }
}
