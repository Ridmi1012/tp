import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmindesingsportfolioComponent } from './admindesingsportfolio.component';

describe('AdmindesingsportfolioComponent', () => {
  let component: AdmindesingsportfolioComponent;
  let fixture: ComponentFixture<AdmindesingsportfolioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmindesingsportfolioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdmindesingsportfolioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
