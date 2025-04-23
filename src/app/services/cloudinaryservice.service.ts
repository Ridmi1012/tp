import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryserviceService {

  private cloudName = 'dfbsh7nzm';
  private uploadPreset = 'sdp_app_uploads'; // Create this in Cloudinary dashboard

  constructor(private http: HttpClient) { }

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    
    return this.http.post(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, formData);
  }
  
  // Helper method to get secure URL from public ID (if needed)
  getImageUrl(publicId: string): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`;
  }
}
