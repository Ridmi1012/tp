import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageportfolioComponent } from './manageportfolio.component';

describe('ManageportfolioComponent', () => {
  let component: ManageportfolioComponent;
  let fixture: ComponentFixture<ManageportfolioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageportfolioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageportfolioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
