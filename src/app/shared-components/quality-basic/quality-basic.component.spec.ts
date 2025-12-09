import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QualityBasicComponent } from './quality-basic.component';

describe('QualityBasicComponent', () => {
  let component: QualityBasicComponent;
  let fixture: ComponentFixture<QualityBasicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QualityBasicComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QualityBasicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
