import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderasisComponent } from './orderasis.component';

describe('OrderasisComponent', () => {
  let component: OrderasisComponent;
  let fixture: ComponentFixture<OrderasisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderasisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderasisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
