import { Injectable , Optional} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { forwardRef, Inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8083/api/notifications';
  private notificationSubject = new Subject<{ title: string, body: string, icon?: string, data?: any }>();
  
  // Add a counter for unread notifications
  private unreadNotificationsCount = new BehaviorSubject<number>(0);
  public unreadCount = this.unreadNotificationsCount.asObservable();
  
  // Store notifications in memory for display
  private notificationsList: {title: string, body: string, read: boolean, timestamp: Date, data?: any}[] = [];
  private notificationsListSubject = new BehaviorSubject<{title: string, body: string, read: boolean, timestamp: Date, data?: any}[]>([]);
  public notifications$ = this.notificationsListSubject.asObservable();
  
  constructor(
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
    private http: HttpClient,
    @Optional() private swPush: SwPush
  ) {
    // Check if SwPush is available
    if (this.isPushNotificationSupported()) {
      try {
        // Subscribe to messages only if SwPush is available
        this.swPush?.messages.subscribe(notification => {
          this.processNotification(notification as any);
        });
        
        // Handle notification clicks - also wrapped in try/catch
        this.swPush?.notificationClicks.subscribe(event => {
          console.log('Notification clicked:', event);
          
          // Handle navigation based on notification data
          if (event.notification && event.notification.data && event.notification.data.orderId) {
            // Mark notification as read
            this.markNotificationAsRead(event.notification.data.orderId);
            
            // Navigate to order details page
            window.location.href = `/admin/orders/${event.notification.data.orderId}`;
          }
        });
      } catch (error) {
        console.warn('Push notification subscriptions failed:', error);
      }
      
      // Load initial notifications regardless of push support
      this.loadNotifications();
      
      // Try to load initial notifications count
      this.getUnreadNotificationsCount().subscribe({
        next: count => {
          this.unreadNotificationsCount.next(count);
        },
        error: err => {
          console.warn('Failed to get notification count:', err);
          // Just use local count instead
          this.updateUnreadCount();
        }
      });
    } else {
      // Still initialize local notifications if push is not supported
      this.loadNotifications();
      this.updateUnreadCount();
    }
  }

  // Helper method to get auth headers
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (token) {
      return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }
    return new HttpHeaders();
  }

  // Enhanced method to check if push is supported, with additional checks for mock
  isPushNotificationSupported(): boolean {
    try {
      const browserSupport = 'serviceWorker' in navigator && 'PushManager' in window;
      const swPushValid = this.swPush && typeof this.swPush.requestSubscription === 'function';
      return browserSupport && swPushValid;
    } catch (error) {
      console.warn('Error checking push notification support:', error);
      return false;
    }
  }

  private loadNotifications() {
    const savedNotifications = localStorage.getItem('adminNotifications');
    if (savedNotifications) {
      try {
        this.notificationsList = JSON.parse(savedNotifications);
        this.notificationsListSubject.next(this.notificationsList);
        this.updateUnreadCount();
      } catch (e) {
        console.error('Error loading saved notifications', e);
      }
    }
  }

  private saveNotifications() {
    localStorage.setItem('adminNotifications', JSON.stringify(this.notificationsList));
  }

  private processNotification(notification: { title: string, body: string, icon?: string, data?: any }) {
    // Add to notifications list
    const newNotification = {
      title: notification.title,
      body: notification.body,
      read: false,
      timestamp: new Date(),
      data: notification.data
    };
    
    this.notificationsList.unshift(newNotification);
    // Keep only last 50 notifications
    if (this.notificationsList.length > 50) {
      this.notificationsList = this.notificationsList.slice(0, 50);
    }
    
    this.notificationsListSubject.next(this.notificationsList);
    this.saveNotifications();
    this.updateUnreadCount();
    
    // Forward to subscribers
    this.notificationSubject.next(notification);
  }

  private updateUnreadCount() {
    const count = this.notificationsList.filter(n => !n.read).length;
    this.unreadNotificationsCount.next(count);
  }

  // Request permission and subscribe to push notifications
  requestSubscription(): Observable<PushSubscription | null> {
    if (!this.isPushNotificationSupported()) {
      console.warn('Push notifications are not supported in this browser');
      return of(null);
    }
    
    return new Observable(observer => {
      this.swPush?.requestSubscription({
        serverPublicKey: environment.vapidPublicKey
      })
      .then(subscription => {
        // Send subscription to backend
        this.sendSubscriptionToServer(subscription).subscribe({
          next: () => {
            observer.next(subscription);
            observer.complete();
          },
          error: err => {
            console.error('Error saving subscription:', err);
            observer.error(err);
          }
        });
      })
      .catch(err => {
        console.error('Could not subscribe to notifications', err);
        observer.error(err);
      });
    });
  }

  // Send the push subscription object to backend
  private sendSubscriptionToServer(subscription: PushSubscription): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/subscribe`, { subscription }, { headers })
      .pipe(
        tap(() => console.log('Subscription sent to server')),
        catchError(error => {
          console.error('Error sending subscription to server:', error);
          throw error;
        })
      );
  }

  // Get notification updates as observable
  get notificationUpdates(): Observable<{ title: string, body: string, icon?: string, data?: any }> {
    return this.notificationSubject.asObservable();
  }

  // Unsubscribe from push notifications
  unsubscribe(): Promise<void> {
    if (!this.isPushNotificationSupported()) {
      return Promise.resolve();
    }
    return this.swPush?.unsubscribe() || Promise.resolve();
  }

  // Check subscription status
  getSubscription(): Promise<PushSubscription | null | undefined> {
    if (!this.isPushNotificationSupported()) {
      return Promise.resolve(null);
    }
    
    try {
      // Convert Observable to Promise using firstValueFrom
      return this.swPush?.subscription ? 
        import('rxjs').then(rxjs => rxjs.firstValueFrom(this.swPush.subscription)) : 
        Promise.resolve(null);
    } catch (error) {
      console.error('Error getting subscription:', error);
      return Promise.resolve(null);
    }
  }
    
  // Get unread notifications count
  getUnreadNotificationsCount(): Observable<number> {
    const headers = this.getAuthHeaders();
    return this.http.get<number>(`${this.apiUrl}/unread/count`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching unread notification count:', error);
          return of(0);
        })
      );
  }

  // Mark notification as read
  markNotificationAsRead(orderId: string) {
    // Update local list
    this.notificationsList = this.notificationsList.map(n => {
      if (n.data && n.data.orderId === orderId) {
        return { ...n, read: true };
      }
      return n;
    });
    
    this.notificationsListSubject.next(this.notificationsList);
    this.saveNotifications();
    this.updateUnreadCount();
    
    // Update on server
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/mark-read`, { orderId }, { headers })
      .pipe(
        catchError(error => {
          console.error('Error marking notification as read:', error);
          return of(null);
        })
      );
  }

  // Mark all notifications as read
  markAllNotificationsAsRead() {
    // Update local list
    this.notificationsList = this.notificationsList.map(n => ({ ...n, read: true }));
    this.notificationsListSubject.next(this.notificationsList);
    this.saveNotifications();
    this.updateUnreadCount();
    
    // Update on server
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/mark-all-read`, {}, { headers })
      .pipe(
        catchError(error => {
          console.error('Error marking all notifications as read:', error);
          return of(null);
        })
      );
  }

  // Show a local notification (fallback when push is not available)
  showLocalNotification(title: string, body: string, icon?: string, data?: any): void {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const notification = new Notification(title, {
            body,
            icon: icon || '/assets/icons/logo-72x72.png',
            data
          });
          
          // Also process this notification for our local storage
          this.processNotification({ title, body, icon, data });
          
          notification.onclick = () => {
            if (data && data.orderId) {
              this.markNotificationAsRead(data.orderId);
              window.location.href = `/admin/orders/${data.orderId}`;
            }
          };
        }
      });
    }
  }

  // Send a test notification
  sendTestNotification(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/test`, {}, { headers })
      .pipe(
        tap(() => console.log('Test notification sent')),
        catchError(error => {
          console.error('Error sending test notification:', error);
          throw error;
        })
      );
  }

  // This specific method would be called when a new order is created
  triggerOrderNotification(order: any) {
    // Check if we already have a notification for this order
    const existingNotification = this.notificationsList.find(
      n => n.data && n.data.orderId === order._id
    );
    
    // Only create notification if it doesn't already exist
    if (!existingNotification) {
      const title = 'New Order Request';
      const body = `Order #${order.orderNumber} received from ${order.customerInfo.firstName} ${order.customerInfo.lastName}`;
      const data = { orderId: order._id, type: 'new-order' };
      
      this.showLocalNotification(title, body, '/assets/icons/order-icon.png', data);
    }
  }
}
