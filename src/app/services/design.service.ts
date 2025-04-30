import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Item } from './item.service';
import { Category } from './category.service';
import { AuthService } from './auth.service';
import { catchError, tap} from 'rxjs/operators';
import { throwError } from 'rxjs';

// Interface for the items included in a design
export interface DesignItemRequest {
  itemId: number;
  defaultQuantity: number;
  isOptional: boolean;
}

// Interface for creating/updating a design
export interface DesignRequest {
  name: string;
  categoryId: number;
  basePrice: number;
  description: string;
  imageUrl?: string;
  additionalImages?: string[]; // Added for multiple images
  createdBy: number;
  items: DesignItemRequest[]; // Changed from DesignRequest[] to DesignItemRequest[]
}

// Interface for item response in a design
export interface DesignItemResponse {
  designItemID: number;
  item: Item;
  defaultQuantity: number;
  isOptional: boolean;
}

// Interface for a design response from the API
export interface Design {
  designID: number;
  name: string;
  category: Category;
  basePrice: number;
  description: string;
  imageUrl: string;
  additionalImages?: string[]; // Added for multiple images
  items: DesignItemResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class DesignService {
  private apiUrl = 'http://localhost:8083/api/designs';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Public endpoints - no auth required
  getAllDesigns(): Observable<Design[]> {
    console.log('Fetching designs from:', this.apiUrl);
    return this.http.get<Design[]>(this.apiUrl).pipe(
      tap(designs => console.log('Fetched designs:', designs)),
      catchError(this.handleError)
    );
  }

  getDesignById(id: number): Observable<Design> {
    return this.http.get<Design>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  getDesignsByCategory(categoryId: number): Observable<Design[]> {
    return this.http.get<Design[]>(`${this.apiUrl}/category/${categoryId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Admin endpoints - require authentication
  addDesign(formData: FormData): Observable<Design> {
    console.log('Adding design with formData');
    
    // For multipart/form-data requests, the Content-Type header is automatically set
    // We only need to provide the Authorization header
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
    
    return this.http.post<Design>(this.apiUrl, formData, { headers }).pipe(
      tap(response => console.log('Add design response:', response)),
      catchError(this.handleError)
    );
  }

  updateDesign(id: number, formData: FormData): Observable<Design> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
    
    return this.http.put<Design>(`${this.apiUrl}/${id}`, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  deleteDesign(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Helper method to prepare form data for design creation/update
  prepareFormData(design: DesignRequest): FormData {
    const formData = new FormData();
    
    // Convert design object to JSON and append as 'design' part
    const designBlob = new Blob([JSON.stringify(design)], { type: 'application/json' });
    formData.append('design', designBlob);
    
    // Note: We're not appending actual image files anymore since we're using Cloudinary
    // The design object already contains the Cloudinary URLs
    
    return formData;
  }

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Handle specific error cases
      if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this action. Admin privileges are required.';
      } else if (error.status === 401) {
        errorMessage = 'Authentication required. Please log in.';
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}