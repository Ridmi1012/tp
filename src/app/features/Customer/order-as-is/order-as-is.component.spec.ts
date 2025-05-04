import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderAsIsComponent } from './order-as-is.component';

describe('OrderAsIsComponent', () => {
  let component: OrderAsIsComponent;
  let fixture: ComponentFixture<OrderAsIsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderAsIsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderAsIsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
