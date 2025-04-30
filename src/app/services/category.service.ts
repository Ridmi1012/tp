import { Injectable } from '@angular/core';
import { HttpClient , HttpErrorResponse} from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service';

export interface Category {
  categoryID: number;
  name: string;
  description: string;
  iconClass?: string;
}

export interface CategoryRequest {
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = 'http://localhost:8083/api/categories';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Public endpoints - no auth required
  getCategories(): Observable<Category[]> {
    console.log('Fetching categories from:', this.apiUrl);
    // GET requests to categories are public (no auth headers needed)
    return this.http.get<Category[]>(this.apiUrl).pipe(
      tap(categories => console.log('Fetched categories:', categories)),
      catchError(this.handleError)
    );
  }

  getCategoryById(id: number): Observable<Category> {
    // GET requests to categories are public (no auth headers needed)
    return this.http.get<Category>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Admin endpoints - these will use auth from the interceptor
  addCategory(category: CategoryRequest): Observable<Category> {
    // POST requests require authentication
    console.log('Adding category:', category);
    return this.http.post<Category>(this.apiUrl, category, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(response => console.log('Add category response:', response)),
      catchError(this.handleError)
    );
  }

  updateCategory(id: number, category: CategoryRequest): Observable<Category> {
    // PUT requests require authentication
    return this.http.put<Category>(`${this.apiUrl}/${id}`, category, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  deleteCategory(id: number): Observable<any> {
    // DELETE requests require authentication
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
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
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}