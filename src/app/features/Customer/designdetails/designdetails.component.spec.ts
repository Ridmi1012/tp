import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DesigndetailsComponent } from './designdetails.component';

describe('DesigndetailsComponent', () => {
  let component: DesigndetailsComponent;
  let fixture: ComponentFixture<DesigndetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesigndetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DesigndetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
