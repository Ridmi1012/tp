
// src/app/mock-sw-push.provider.ts
import { Provider } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import {Subject } from 'rxjs';
import { of } from 'rxjs';

export class MockSwPush {
    // Create subjects for messages and notification clicks
    private _messages = new Subject<any>();
    private _notificationClicks = new Subject<any>();
    
    // Expose as observables
    messages = this._messages.asObservable();
    notificationClicks = this._notificationClicks.asObservable();
    
    // Create an observable for subscription
    subscription = of(null);
    
    // Create a method to manually trigger messages and clicks for testing
    simulateMessage(data: any) {
      this._messages.next(data);
    }
    
    simulateNotificationClick(data: any) {
      this._notificationClicks.next(data);
    }
    
    // Mock the requestSubscription method
    requestSubscription() {
      console.log('Mock SwPush: requestSubscription called');
      return Promise.reject('Push notifications not supported in this environment');
    }
    
    // Mock the unsubscribe method
    unsubscribe() {
      console.log('Mock SwPush: unsubscribe called');
      return Promise.resolve();
    }
    
    // For debugging
    constructor() {
      console.log('MockSwPush initialized');
    }
  }
  
  export const mockSwPushProvider: Provider = {
    provide: SwPush,
    useClass: MockSwPush
  };