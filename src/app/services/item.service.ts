import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';  
import { AuthService } from './auth.service';
import { HttpHeaders } from '@angular/common/http';

export interface Item {
  itemID: number;
  name: string;
  description: string;
  unitPrice: number;
  pricePerUnit?: number; // Optional for backward compatibility
  category?: {
    categoryID: number;
    name: string;
  };
  categoryID?: string; // Optional for backward compatibility
}

export interface ItemRequest {
  name: string;
  description: string;
  unitPrice: number;
}

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private apiUrl = 'http://localhost:8083/api/items';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`);
  }

  getItems(): Observable<Item[]> {
    console.log('Fetching items from:', this.apiUrl);
    // GET requests don't need authentication
    return this.http.get<Item[]>(this.apiUrl).pipe(
      tap(items => console.log('Fetched items:', items)),
      catchError(this.handleError)
    );
  }

  getItemById(id: number): Observable<Item> {
    // GET requests don't need authentication
    return this.http.get<Item>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

   getItemsByCategory(categoryId: string): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.apiUrl}/category/${categoryId}`).pipe(
      catchError(this.handleError)
    );
  }

  addItem(item: ItemRequest): Observable<Item> {
    // Ensure unitPrice is a number and not null/undefined
    const formattedItem: ItemRequest = {
      name: item.name,
      description: item.description || '',
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
      
    };
    
    console.log('Sending item to API:', formattedItem);
    
    // Use auth headers for POST requests
    return this.http.post<Item>(this.apiUrl, formattedItem, { 
      headers: this.authService.getAuthHeaders() 
    }).pipe(
      tap(response => console.log('Add item response:', response)),
      catchError(this.handleError)
    );
  }

  updateItem(id: number, item: ItemRequest): Observable<Item> {
    // Ensure unitPrice is a number and not null/undefined
    const formattedItem: ItemRequest = {
      name: item.name,
      description: item.description || '',
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0
    };

    // Use auth headers for PUT requests
    return this.http.put<Item>(`${this.apiUrl}/${id}`, formattedItem, { 
      headers: this.authService.getAuthHeaders() 
    }).pipe(
      catchError(this.handleError)
    );
  }

  deleteItem(id: number): Observable<any> {
    // Use auth headers for DELETE requests
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
    }
    
    return throwError(() => new Error(errorMessage));
  }
}