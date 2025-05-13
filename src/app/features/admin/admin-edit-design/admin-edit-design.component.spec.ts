import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEditDesignComponent } from './admin-edit-design.component';

describe('AdminEditDesignComponent', () => {
  let component: AdminEditDesignComponent;
  let fixture: ComponentFixture<AdminEditDesignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEditDesignComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminEditDesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
