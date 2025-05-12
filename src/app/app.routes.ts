
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { Routes } from '@angular/router';

// Basic Pages
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { HomeComponent } from './features/Customer/home/home.component';
import { UnauthorizedComponent } from './features/unauthorized/unauthorized/unauthorized.component';

// Customer Pages
import { PortfolioComponent } from './features/Customer/portfolio/portfolio.component';
import { DesigndetailsComponent } from './features/Customer/designdetails/designdetails.component';
import { OngoingComponent } from './features/Customer/ongoing/ongoing.component';

import { ReviewsComponent } from './features/Customer/reviews/reviews.component';
import { OrderAsIsComponent } from './features/Customer/order-as-is/order-as-is.component';
import { CustomereditprofileComponent } from './auth/customereditprofile/customereditprofile.component';
import { ResetpasswordComponent } from './auth/resetpassword/resetpassword.component';

// Admin Pages
import { AdmindashboardComponent } from './features/admin/admindashboard/admindashboard.component';
import { ItemmanagementComponent } from './features/admin/itemmanagement/itemmanagement.component';
import { CategorymanagementComponent } from './features/admin/categorymanagement/categorymanagement.component';
import { ManageportfolioComponent } from './features/admin/manageportfolio/manageportfolio.component';

import { AdmindesingsportfolioComponent } from './features/admin/admindesingsportfolio/admindesingsportfolio.component';
import { ReviewFormComponent } from './features/Customer/reviewform/reviewform.component';
import { AdminOrdersComponent } from './features/admin/admin-orders/admin-orders.component';
import { AdminOrderDetailsComponent } from './features/admin/admin-order-details/admin-order-details.component';
import { AdminConfirmedOrdersComponent } from './features/admin/admin-confirmed-orders/admin-confirmed-orders.component';
import { AdminConfirmDialogComponent } from './features/admin/admin-confirm-dialog/admin-confirm-dialog.component';
import { AdminPaymentHistoryComponent } from './features/admin/admin-payment-history/admin-payment-history.component';
import { AdminPaymentVerificationComponent } from './features/admin/admin-payment-verification/admin-payment-verification.component';
import { AdminEventCalanderComponent } from './features/admin/admin-event-calander/admin-event-calander.component';
import { PaymentSuccessComponent } from './features/admin/payment-success/payment-success.component';
import { PaymentCancelComponent } from './features/admin/payment-cancel/payment-cancel.component';

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
  path: 'order-as-is/:designId', 
  component: OrderAsIsComponent,
  canActivate: [authGuard]
},
 { 
   path: 'change-password', 
   component: ResetpasswordComponent,
   canActivate: [authGuard]
 },
 // Admin Routes
 { 
  path: 'admin-dashboard', 
  component: AdmindashboardComponent,
  canActivate: [adminGuard]
},
{ 
  path: 'admin-portfolio', 
  component: AdmindesingsportfolioComponent,
  canActivate: [adminGuard]
},
{ 
 path: 'admin/orders/confirmed', 
 component: AdminConfirmedOrdersComponent,
 canActivate: [adminGuard]
},
{
  path: 'admin/design',
  component: ManageportfolioComponent,
  canActivate: [adminGuard]
},
{
 path: 'admin/orders',  
 component: AdminOrdersComponent,
 canActivate: [adminGuard]
},
{
 path: 'admin/orders/pending',  
 component: AdminOrdersComponent,
 canActivate: [adminGuard],
 data: { filter: 'pending' }
},
{
 path: 'admin/payment-verification',  
 component: AdminPaymentVerificationComponent,
 canActivate: [adminGuard]
},
{
 path: 'admin/payment-history',  
 component: AdminPaymentHistoryComponent,
 canActivate: [adminGuard]
},
{
 path: 'admin/orderdetails/:id',  
 component: AdminOrderDetailsComponent,
 canActivate: [adminGuard]
},
{
  path: 'admin/categories',
  component: CategorymanagementComponent,
  canActivate: [adminGuard]
},
{
  path: 'admin/events',  
  component: AdminEventCalanderComponent,
  canActivate: [adminGuard]
},
{ 
 path: 'orders/ongoing', 
 component: OngoingComponent,
 canActivate: [authGuard], 
 data: { title: 'My Ongoing Orders' } 
},
{
  path: 'payment-success',
  component: PaymentSuccessComponent,
  canActivate: [adminGuard, authGuard]
},
{
  path: 'payment-cancel',
  component: PaymentCancelComponent,
  canActivate: [adminGuard, authGuard]
},
{ 
 path: 'orders/confirmed', 
 component: AdminConfirmedOrdersComponent, 
 canActivate: [authGuard],
 data: { title: 'My Active Orders' }
},
{
  path: 'admin/items',
  component: ItemmanagementComponent,
  canActivate: [adminGuard]
},

 { path: '**', redirectTo: 'home' }
];