import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NgsRevealModule } from 'ngx-scrollreveal';  // Use correct module
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { mockSwPushProvider } from './mock-sw-push.provider';
import { tokenInterceptor } from './interceptors/token.interceptor';





export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    mockSwPushProvider,
    NgsRevealModule,
  ],
};
