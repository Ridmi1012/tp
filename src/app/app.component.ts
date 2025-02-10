import { Component } from '@angular/core';
import { LoginComponent } from "./auth/login/login.component";
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomeComponent } from "./features/home/home.component";
import { PortfolioComponent } from "./features/portfolio/portfolio.component";
import { AppointmentsComponent } from './features/appointments/appointments.component';
import { ReviewsComponent } from './features/reviews/reviews.component';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, FooterComponent, HomeComponent, PortfolioComponent, AppointmentsComponent, ReviewsComponent, LoginComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'tp';
}
