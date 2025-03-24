import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { HomeComponent } from './home/home.component';
import { AppointmentsComponent } from './appointments/appointments.component';
import { ReviewsComponent } from './reviews/reviews.component';
import { BookingFormComponent } from './bookingform/bookingform.component';
import { OngoingComponent } from './ongoing/ongoing.component';
import { ReviewformComponent } from './reviewform/reviewform.component';




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
    ReviewformComponent
  ]
})
export class FeaturesModule { }
