import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioComponent } from './Customer/portfolio/portfolio.component';
import { HomeComponent } from './Customer/home/home.component';
import { AppointmentsComponent } from './Customer/appointments/appointments.component';
import { ReviewsComponent } from './Customer/reviews/reviews.component';
import { BookingFormComponent } from './Customer/bookingform/bookingform.component';
import { OngoingComponent } from './Customer/ongoing/ongoing.component';
import { ReviewFormComponent } from './Customer/reviewform/reviewform.component';




@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HomeComponent, 
    PortfolioComponent,
    AppointmentsComponent,
    ReviewsComponent,
    BookingFormComponent,
    OngoingComponent,
    ReviewFormComponent
  ]
})
export class FeaturesModule { }
