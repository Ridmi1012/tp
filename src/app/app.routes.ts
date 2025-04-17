import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { PortfolioComponent } from './features/portfolio/portfolio.component';
import { ReviewsComponent } from './features/reviews/reviews.component';
import { AppointmentsComponent } from './features/appointments/appointments.component';
import { BookingFormComponent } from './features/bookingform/bookingform.component';
import { OngoingComponent } from './features/ongoing/ongoing.component';
import { CustomerdashboardComponent } from './features/customerdashboard/customerdashboard.component';
import { ReviewFormComponent } from './features/reviewform/reviewform.component';
import { AdmindashboardComponent } from './features/admindashboard/admindashboard.component';
import { CustomereditprofileComponent } from './auth/customereditprofile/customereditprofile.component';
import { ResetpasswordComponent } from './auth/resetpassword/resetpassword.component';
import { ChangepasswordComponent } from './auth/changepassword/changepassword.component';
import { ManageportfolioComponent } from './features/manageportfolio/manageportfolio.component';
import { ItemmanagementComponent } from './features/itemmanagement/itemmanagement.component';
import { CategorymanagementComponent } from './features/categorymanagement/categorymanagement.component';





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
    {
        path: 'admin',
        children: [
          { path: '', component: AdmindashboardComponent },
          { path: 'design', component: ManageportfolioComponent },
          { path: 'categories', component: CategorymanagementComponent },
          { path: 'items', component: ItemmanagementComponent }
        ]
    },
    {path: '**', redirectTo: ''}
];