import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullyCustomizeDesignComponent } from './fully-customize-design.component';

describe('FullyCustomizeDesignComponent', () => {
  let component: FullyCustomizeDesignComponent;
  let fixture: ComponentFixture<FullyCustomizeDesignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullyCustomizeDesignComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullyCustomizeDesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
