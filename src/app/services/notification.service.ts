import { Injectable , Optional} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';




export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  orderId?: string;
  read: boolean;
  timestamp: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8083/api/notifications';
  
  // Notification observables
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationUpdatesSubject = new Subject<Notification>();
  
  // Public observables
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount = this.unreadCountSubject.asObservable();
  public notificationUpdates = this.notificationUpdatesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Load notifications initially if user is logged in
    if (this.authService.isLoggedIn()) {
      this.loadNotifications();
    }
    
    // Subscribe to auth changes to load notifications when user logs in
    this.authService.authChange.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.loadNotifications();
      } else {
        // Clear notifications when user logs out
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
      }
    });
    
    // Set up polling for notifications (every 30 seconds)
    setInterval(() => {
      if (this.authService.isLoggedIn()) {
        this.loadNotifications();
      }
    }, 30000);
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    return new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`);
  }

  loadNotifications(): void {
  try {
    const headers = this.getHeaders();
    this.http.get<any>(`${this.apiUrl}`, { headers })
      .pipe(
        tap(response => {
          console.log('Received notification response:', response);
          
          // Check if notifications array exists
          if (response && response.notifications) {
            // Transform the notifications from the backend format
            const notifications = response.notifications.map((notification: any) => ({
              id: notification.id.toString(),
              title: notification.title || 'No Title',
              body: notification.body || 'No content',
              type: notification.type || 'unknown',
              orderId: notification.orderId || null,
              read: !!notification.read, // Convert to boolean
              timestamp: notification.timestamp || new Date().toISOString(),
              data: { type: notification.type, orderId: notification.orderId }
            }));
            
            // Update notifications
            this.notificationsSubject.next(notifications);
            
            // Update unread count
            const unreadCount = notifications.filter((n: Notification) => !n.read).length;
            this.unreadCountSubject.next(unreadCount);
            
            // Log success
            console.log('Successfully loaded notifications:', notifications.length);
          } else {
            console.warn('Received empty or invalid notification format:', response);
            this.notificationsSubject.next([]);
            this.unreadCountSubject.next(0);
          }
        }),
        catchError(error => {
          console.error('Error loading notifications:', error);
          // Check specific error details
          if (error.status === 403) {
            console.error('Authorization error - check user permissions');
          } else if (error.status === 500) {
            console.error('Server error - check backend logs');
          }
          return of({ notifications: [] });
        })
      )
      .subscribe();
  } catch (error) {
    console.error('Error getting headers:', error);
  }
}

  markNotificationAsRead(notificationId: string): Observable<any> {
    try {
      const headers = this.getHeaders();
      return this.http.post<any>(`${this.apiUrl}/${notificationId}/read`, {}, { headers })
        .pipe(
          tap(() => {
            // Update local notification state
            const notifications = this.notificationsSubject.getValue();
            const updatedNotifications = notifications.map(notification => {
              if (notification.id === notificationId) {
                return { ...notification, read: true };
              }
              return notification;
            });
            
            this.notificationsSubject.next(updatedNotifications);
            
            // Update unread count
            const unreadCount = updatedNotifications.filter(notification => !notification.read).length;
            this.unreadCountSubject.next(unreadCount);
          }),
          catchError(error => {
            console.error('Error marking notification as read:', error);
            return of({ success: false });
          })
        );
    } catch (error) {
      console.error('Error getting headers:', error);
      return of({ success: false });
    }
  }

  markAllNotificationsAsRead(): Observable<any> {
    try {
      const headers = this.getHeaders();
      return this.http.post<any>(`${this.apiUrl}/read-all`, {}, { headers })
        .pipe(
          tap(() => {
            // Update all notifications as read
            const notifications = this.notificationsSubject.getValue();
            const updatedNotifications = notifications.map(notification => ({
              ...notification,
              read: true
            }));
            
            this.notificationsSubject.next(updatedNotifications);
            this.unreadCountSubject.next(0);
          }),
          catchError(error => {
            console.error('Error marking all notifications as read:', error);
            return of({ success: false });
          })
        );
    } catch (error) {
      console.error('Error getting headers:', error);
      return of({ success: false });
    }
  }

  // This method is used to trigger order notification in admin panel
  triggerOrderNotification(order: any): void {
    const notification: Notification = {
      id: Date.now().toString(), // temporary ID
      title: 'New Order',
      body: `Order #${order.orderNumber} received`,
      type: 'new-order',
      orderId: order._id,
      read: false,
      timestamp: new Date().toISOString(),
      data: { type: 'new-order', orderId: order._id }
    };
    
    this.notificationUpdatesSubject.next(notification);
    
    // Update notifications list and unread count
    const notifications = this.notificationsSubject.getValue();
    const updatedNotifications = [notification, ...notifications];
    this.notificationsSubject.next(updatedNotifications);
    
    // Update unread count
    const unreadCount = updatedNotifications.filter(n => !n.read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  // Method to check if push notifications are supported by the browser
  isPushNotificationSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Request subscription for push notifications
  requestSubscription(): Observable<any> {
    if (!this.isPushNotificationSupported()) {
      return of({ success: false, message: 'Push notifications are not supported by your browser' });
    }
    
    // In a real implementation, this would register the service worker
    // and request push notification permission
    return of({ success: true, message: 'Push notification subscription simulated successfully' });
  }

  // Send a notification to the customer (would typically be handled by backend)
  sendCustomerNotification(customerId: string, title: string, message: string): Observable<any> {
    try {
      const headers = this.getHeaders();
      return this.http.post<any>(`${this.apiUrl}/send`, {
        customerId,
        title,
        body: message
      }, { headers }).pipe(
        catchError(error => {
          console.error('Error sending notification:', error);
          return of({ success: false });
        })
      );
    } catch (error) {
      console.error('Error getting headers:', error);
      return of({ success: false });
    }
  }
}
