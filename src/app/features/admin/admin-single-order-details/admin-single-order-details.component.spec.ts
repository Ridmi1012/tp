import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSingleOrderDetailsComponent } from './admin-single-order-details.component';

describe('AdminSingleOrderDetailsComponent', () => {
  let component: AdminSingleOrderDetailsComponent;
  let fixture: ComponentFixture<AdminSingleOrderDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSingleOrderDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminSingleOrderDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
