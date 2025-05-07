import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';


export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  asset_id?: string;
  version?: number;
  version_id?: string;
  signature?: string;
  width?: number;
  height?: number;
  format?: string;
  resource_type?: string;
  created_at?: string;
  tags?: string[];
  bytes?: number;
  type?: string;
  etag?: string;
  url?: string;
  original_filename?: string;
  [key: string]: any; // For any other properties
}


@Injectable({
  providedIn: 'root'
})
export class CloudinaryserviceService {
  private cloudName = 'dfbsh7nzm';
  private uploadPreset = 'sdp_app_uploads'; // Make sure this preset is configured to be unsigned in Cloudinary

  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<CloudinaryResponse> {
    // Validate file before sending to Cloudinary
    if (!file) {
      return throwError(() => new Error('No file selected for upload'));
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return throwError(() => new Error('Invalid file type. Please upload an image.'));
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return throwError(() => new Error('File size exceeds 5MB limit.'));
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    
    // Optional: add a timestamp and unique identifier to prevent cache issues
    formData.append('timestamp', String(Date.now() / 1000));
    formData.append('api_key', ''); // Leave empty for unsigned uploads with upload_preset
    
    return this.http.post<CloudinaryResponse>(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, 
      formData
    ).pipe(
      tap(response => console.log('Cloudinary upload successful:', response.secure_url)),
      catchError(error => {
        console.error('Cloudinary upload error:', error);
        // Provide more specific error messages based on the response
        if (error.status === 403) {
          return throwError(() => new Error('Authentication failed with Cloudinary. Please check your upload preset configuration.'));
        } else if (error.status === 400) {
          return throwError(() => new Error('Invalid upload parameters. Please check file format and size.'));
        } else {
          return throwError(() => new Error('Failed to upload image to Cloudinary: ' + (error.error?.message || error.message || 'Unknown error')));
        }
      })
    );
  }
  
  // Helper method to get secure URL from public ID
  getImageUrl(publicId: string): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`;
  }
}
