import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPaymentHistoryComponent } from './admin-payment-history.component';

describe('AdminPaymentHistoryComponent', () => {
  let component: AdminPaymentHistoryComponent;
  let fixture: ComponentFixture<AdminPaymentHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPaymentHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPaymentHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
