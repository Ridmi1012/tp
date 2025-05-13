import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestSimilerComponent } from './request-similer.component';

describe('RequestSimilerComponent', () => {
  let component: RequestSimilerComponent;
  let fixture: ComponentFixture<RequestSimilerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestSimilerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestSimilerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
