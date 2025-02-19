import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { PortfolioComponent } from './features/portfolio/portfolio.component';
import { AppComponent } from './app.component';
import { ReviewsComponent } from './features/reviews/reviews.component';
import { AppointmentsComponent } from './features/appointments/appointments.component';



export const routes: Routes = [
    {path: '', component: HomeComponent},
    {path: 'login', component: LoginComponent},
    {path: 'register', component: RegisterComponent},
    {path:'portfolio', component: PortfolioComponent},
    {path: 'appointments', component: AppointmentsComponent},
    {path: 'reviews', component:ReviewsComponent},
    {path: '**', redirectTo: ''}
];
