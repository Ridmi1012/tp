import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioComponent } from './Customer/portfolio/portfolio.component';
import { HomeComponent } from './Customer/home/home.component';

import { ReviewsComponent } from './Customer/reviews/reviews.component';

import { OngoingComponent } from './Customer/ongoing/ongoing.component';
import { ReviewFormComponent } from './Customer/reviewform/reviewform.component';
import { AdminOrderDetailsComponent } from './admin/admin-order-details/admin-order-details.component';
import { AdminConfirmDialogComponent } from './admin/admin-confirm-dialog/admin-confirm-dialog.component';
import { AdminOrdersComponent } from './admin/admin-orders/admin-orders.component';
import { mockSwPushProvider } from '../mock-sw-push.provider';




@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HomeComponent, 
    PortfolioComponent,
    ReviewsComponent,
    OngoingComponent,
    ReviewFormComponent,
    AdminOrderDetailsComponent,
    AdminConfirmDialogComponent,
    AdminOrdersComponent
  ],
  providers: [
    
  ]
})
export class FeaturesModule { }
