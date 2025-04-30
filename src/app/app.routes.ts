import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

// Basic Pages
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { HomeComponent } from './features/Customer/home/home.component';
import { UnauthorizedComponent } from './features/unauthorized/unauthorized/unauthorized.component';

// Customer Pages
import { PortfolioComponent } from './features/Customer/portfolio/portfolio.component';
import { DesigndetailsComponent } from './features/Customer/designdetails/designdetails.component';
import { OrderasisComponent } from './features/Customer/orderasis/orderasis.component';
import { CustomDesignComponent } from './features/Customer/custom-design/custom-design.component';
import { OngoingComponent } from './features/Customer/ongoing/ongoing.component';
import { OrderdetailsComponent } from './features/Customer/orderdetails/orderdetails.component';

import { ReviewsComponent } from './features/Customer/reviews/reviews.component';

import { CustomereditprofileComponent } from './auth/customereditprofile/customereditprofile.component';
import { ResetpasswordComponent } from './auth/resetpassword/resetpassword.component';
import { RequestCustomDesignComponent } from './features/Customer/request-custom-design/request-custom-design.component';

// Admin Pages
import { AdmindashboardComponent } from './features/admin/admindashboard/admindashboard.component';
import { ItemmanagementComponent } from './features/admin/itemmanagement/itemmanagement.component';
import { CategorymanagementComponent } from './features/admin/categorymanagement/categorymanagement.component';
import { ManageportfolioComponent } from './features/admin/manageportfolio/manageportfolio.component';

import { AdmindesingsportfolioComponent } from './features/admin/admindesingsportfolio/admindesingsportfolio.component';
import { ReviewFormComponent } from './features/Customer/reviewform/reviewform.component';

export const routes: Routes = [
 // Public Routes
 { path: '', redirectTo: 'home', pathMatch: 'full' },
 { path: 'home', component: HomeComponent },
 { path: 'login', component: LoginComponent },
 { path: 'register', component: RegisterComponent },
 { path: 'unauthorized', component: UnauthorizedComponent },
 { path: 'portfolio', component: PortfolioComponent },
 { path: 'portfolio/category/:categoryId', component: PortfolioComponent },
 { path: 'design-details/:id', component: DesigndetailsComponent },
 
 // Customer Service Routes (available to non-logged in users)
 { path: 'reviews', component: ReviewsComponent},
 
 // Protected Customer Routes
 {path:'review-form',
  component: ReviewFormComponent,
   canActivate: [authGuard]
  },

 { 
   path: 'ongoing', 
   component: OngoingComponent,
   canActivate: [authGuard]
 },
 { 
   path: 'edit-customer-details/:customerId', 
   component: CustomereditprofileComponent,
   canActivate: [authGuard]
 },
 { 
   path: 'change-password', 
   component: ResetpasswordComponent,
   canActivate: [authGuard]
 },
 { 
   path: 'order-as-is/:id', 
   component: OrderasisComponent,
   canActivate: [authGuard]
 },
 { 
   path: 'customize/:id', 
   component: CustomDesignComponent,
   canActivate: [authGuard]
 },
 { 
   path: 'request-new-design', 
   component: RequestCustomDesignComponent,
   canActivate: [authGuard]
 },
 { 
   path: 'order-details/:id', 
   component: OrderdetailsComponent,
   canActivate: [authGuard]
 },
 
 // Admin Routes
 { 
   path: 'admin-dashboard', 
   component: AdmindashboardComponent,
   canActivate: [adminGuard]
 },
//  { 
//    path: 'admin/events', 
//    component: AdminEventsComponent,
//    canActivate: [adminGuard]
//  },
 { 
   path: 'admin-portfolio', 
   component: AdmindesingsportfolioComponent,
   canActivate: [adminGuard]
 },
//  { 
//    path: 'admin/inventory', 
//    component: AdminInventoryComponent,
//    canActivate: [adminGuard]
//  },
//  { 
//    path: 'admin/bookings', 
//    component: AdminBookingsComponent,
//    canActivate: [adminGuard]
//  },
//  { 
//    path: 'admin/reports', 
//    component: AdminReportsComponent,
//    canActivate: [adminGuard]
//  },
 // Admin Dashboard specific navigation routes
 {
   path: 'admin/design',
   component: ManageportfolioComponent,
   canActivate: [adminGuard]
 },
 {
   path: 'admin/categories',
   component: CategorymanagementComponent,
   canActivate: [adminGuard]
 },
 {
   path: 'admin/items',
   component: ItemmanagementComponent,
   canActivate: [adminGuard]
 },
//  { 
//    path: 'admin/notifications', 
//    component: AdminNotificationsComponent,
//    canActivate: [adminGuard]
//  },
//  { 
//    path: 'admin/notifications/settings', 
//    component: AdminNotificationSettingsComponent,
//    canActivate: [adminGuard]
//  },
//  { 
//    path: 'admin/profile', 
//    component: AdminProfileComponent,
//    canActivate: [adminGuard]
//  },
//  { 
//    path: 'admin/settings', 
//    component: AdminSettingsComponent,
//    canActivate: [adminGuard]
//  },
//  { 
//    path: 'admin/reset-password', 
//    component: AdminResetPasswordComponent,
//    canActivate: [adminGuard]
//  },
 
 // Default redirect to home
 { path: '**', redirectTo: 'home' }
];