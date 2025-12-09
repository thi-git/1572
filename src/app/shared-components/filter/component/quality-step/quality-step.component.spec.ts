import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QualityStepComponent } from './quality-step.component';

describe('QualityStepComponent', () => {
  let component: QualityStepComponent;
  let fixture: ComponentFixture<QualityStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QualityStepComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QualityStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
