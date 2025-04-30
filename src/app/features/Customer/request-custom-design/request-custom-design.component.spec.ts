import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestCustomDesignComponent } from './request-custom-design.component';

describe('RequestCustomDesignComponent', () => {
  let component: RequestCustomDesignComponent;
  let fixture: ComponentFixture<RequestCustomDesignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestCustomDesignComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestCustomDesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
