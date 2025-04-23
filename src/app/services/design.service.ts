import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Item } from './item.service';
import { Category } from './category.service';

export interface DesignItemRequest {
  itemId: number;
  defaultQuantity: number;
  isOptional: boolean;
}

export interface DesignRequest {
  name: string;
  categoryId: number;
  basePrice: number;
  description: string;
  imageUrl?: string;
  additionalImages?: string[]; // Added for multiple images
  createdBy: number;
  items: DesignItemRequest[];
}

export interface DesignItemResponse {
  designItemID: number;
  item: Item;
  defaultQuantity: number;
  isOptional: boolean;
}

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

  constructor(private http: HttpClient) { }

  getAllDesigns(): Observable<Design[]> {
    return this.http.get<Design[]>(this.apiUrl);
  }

  getDesignById(id: number): Observable<Design> {
    return this.http.get<Design>(`${this.apiUrl}/${id}`);
  }

  getDesignsByCategory(categoryId: number): Observable<Design[]> {
    return this.http.get<Design[]>(`${this.apiUrl}/category/${categoryId}`);
  }

  addDesign(formData: FormData): Observable<Design> {
    return this.http.post<Design>(this.apiUrl, formData);
  }

  updateDesign(id: number, formData: FormData): Observable<Design> {
    return this.http.put<Design>(`${this.apiUrl}/${id}`, formData);
  }

  deleteDesign(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Helper method to prepare form data for design creation/update
  prepareFormData(design: DesignRequest): FormData {
    const formData = new FormData();
    formData.append('design', new Blob([JSON.stringify(design)], { type: 'application/json' }));
    
    // We're now using Cloudinary URLs, so no need to append image files
    
    return formData;
  }
}