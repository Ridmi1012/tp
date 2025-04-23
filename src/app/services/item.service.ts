import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';  

export interface Item {
  itemID: number;
  name: string;
  description: string;
  unitPrice: number;
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

  constructor(private http: HttpClient) { }

  getItems(): Observable<Item[]> {
    return this.http.get<Item[]>(this.apiUrl);
  }

  getItemById(id: number): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl}/${id}`);
  }

  addItem(item: ItemRequest): Observable<Item> {
    const formattedItem = {
      name: item.name,
      description: item.description,
      unitPrice: item.unitPrice,
    };
    
    console.log('Sending item to API:', formattedItem);
    
    return this.http.post<Item>(this.apiUrl, formattedItem);
  }

  updateItem(id: number, item: ItemRequest): Observable<Item> {
    return this.http.put<Item>(`${this.apiUrl}/${id}`, item);
  }

  deleteItem(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
