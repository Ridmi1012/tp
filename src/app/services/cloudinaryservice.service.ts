import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class CloudinaryserviceService {

  private cloudName = 'dfbsh7nzm';
  private uploadPreset = 'sdp_app_uploads'; // Create this in Cloudinary dashboard

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    
    // Remove the Authorization header - it's causing CORS issues
    // Cloudinary authenticates via upload_preset, not headers
    
    return this.http.post(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, 
      formData
    ).pipe(
      tap(response => console.log('Cloudinary upload successful')),
      catchError(error => {
        console.error('Cloudinary upload error:', error);
        return throwError(error);
      })
    );
  }
  
  // Helper method to get secure URL from public ID (if needed)
  getImageUrl(publicId: string): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`;
  }
}
