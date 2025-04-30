import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface OrderAsIs {
  designId: number;
  customerId: number;
  customName: string;
  customAge: number;
  eventDate: string;
  deliveryAddress: string;
}

export interface CustomizedOrder {
  baseDesignId: number;
  customerId: number;
  customName: string;
  customAge: number;
  eventDate: string;
  deliveryAddress: string;
  themeColor?: string;
  conceptDescription?: string;
  addItems?: OrderItem[];
  removeItems?: OrderItem[];
  modifyItems?: OrderItem[];
}

export interface FullyCustomOrder {
  customerId: number;
  customName: string;
  customAge: number;
  eventDate: string;
  deliveryAddress: string;
  themeName: string;
  themeColor?: string;
  conceptDescription: string;
  inspirationImageUrls?: string[];
  items: CustomItem[];
}

export interface OrderItem {
  itemId: number;
  quantity: number;
}

export interface CustomItem {
  itemId?: number;
  customItemName?: string;
  description?: string;
  quantity: number;
}

export interface OrderResponse {
  orderId: number;
  orderStatus: string;
  totalPrice: number;
  orderType: string;
  orderDate: string;
  eventDate: string;
  designName: string;
}

@Injectable({
  providedIn: 'root'
})

export class OrderService {
  private apiUrl = 'http://localhost:8083/api/orders';

  constructor(private http: HttpClient) { }

  // Create an "Order As Is" order
  createOrderAsIs(order: OrderAsIs): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiUrl}/as-is`, order);
  }
  
  // Create a customized order (scenario 2)
  createCustomizedOrder(order: CustomizedOrder): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiUrl}/customize`, order);
  }
  
  // Create a fully custom order (scenario 3)
  createFullyCustomOrder(order: FullyCustomOrder): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiUrl}/fully-custom`, order);
  }

  // Get order by ID
  getOrderById(orderId: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/${orderId}`);
  }

  // Get all orders for a customer
  getCustomerOrders(customerId: number): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.apiUrl}/customer/${customerId}`);
  }
  
  // Get detailed order
  getOrderDetails(orderId: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/${orderId}`);
  }
  
  // Admin methods
  // Get all orders
  getAllOrders(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.apiUrl}`);
  }
  
  // Get orders by status
  getOrdersByStatus(status: string): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.apiUrl}/status/${status}`);
  }
  
  // Get orders by type
  getOrdersByType(type: string): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.apiUrl}/type/${type}`);
  }
  
  // Update order status
  updateOrderStatus(orderId: number, status: string): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.apiUrl}/${orderId}/status?status=${status}`, {});
  }
}
