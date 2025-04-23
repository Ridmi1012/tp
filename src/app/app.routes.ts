import { Routes } from '@angular/router';
import { HomeComponent } from './features/Customer/home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { PortfolioComponent } from './features/Customer/portfolio/portfolio.component';
import { ReviewsComponent } from './features/Customer/reviews/reviews.component';
import { AppointmentsComponent } from './features/Customer/appointments/appointments.component';
import { BookingFormComponent } from './features/Customer/bookingform/bookingform.component';
import { OngoingComponent } from './features/Customer/ongoing/ongoing.component';
import { CustomerdashboardComponent } from './features/Customer/customerdashboard/customerdashboard.component';
import { ReviewFormComponent } from './features/Customer/reviewform/reviewform.component';
import { AdmindashboardComponent } from './features/admin/admindashboard/admindashboard.component';
import { CustomereditprofileComponent } from './auth/customereditprofile/customereditprofile.component';
import { ResetpasswordComponent } from './auth/resetpassword/resetpassword.component';
import { ChangepasswordComponent } from './auth/changepassword/changepassword.component';
import { ManageportfolioComponent } from './features/admin/manageportfolio/manageportfolio.component';
import { ItemmanagementComponent } from './features/admin/itemmanagement/itemmanagement.component';
import { CategorymanagementComponent } from './features/admin/categorymanagement/categorymanagement.component';
import { AdmindesingsportfolioComponent } from './features/admin/admindesingsportfolio/admindesingsportfolio.component';
import { DesigndetailsComponent } from './features/Customer/designdetails/designdetails.component';





export const routes: Routes = [
    {path: '', component: HomeComponent},
    {path: 'login', component: LoginComponent},
    {path: 'register', component: RegisterComponent},
    {path: 'portfolio', component: PortfolioComponent},
    {path: 'appointments', component: AppointmentsComponent},
    {path: 'reviews', component: ReviewsComponent},
    {path: 'log2book', component: CustomerdashboardComponent},
    {path: 'ongoing', component: OngoingComponent},
    {path: 'booking-form', component: BookingFormComponent},
    {path: 'review-form', component: ReviewFormComponent},
    {path: 'admin-dashboard', component: AdmindashboardComponent},
    {path: 'customer-profile', component: CustomereditprofileComponent},
    {path: 'change-password', component: ChangepasswordComponent},
    {path: 'reset-password', component: ResetpasswordComponent},
    {path: 'admin-portfolio', component: AdmindesingsportfolioComponent},
    {path: 'design-details/:id', component: DesigndetailsComponent},
    {path: 'portfolio/category/:categoryId', component: PortfolioComponent},
    {
        path: 'admin',
        children: [
          { path: '', component: AdmindashboardComponent },
          { path: 'design', component: ManageportfolioComponent },
          { path: 'categories', component: CategorymanagementComponent },
          { path: 'items', component: ItemmanagementComponent },
          
        ]
    },
    {path: '**', redirectTo: ''}
];