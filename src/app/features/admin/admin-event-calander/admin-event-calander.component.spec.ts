import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEventCalanderComponent } from './admin-event-calander.component';

describe('AdminEventCalanderComponent', () => {
  let component: AdminEventCalanderComponent;
  let fixture: ComponentFixture<AdminEventCalanderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEventCalanderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminEventCalanderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
