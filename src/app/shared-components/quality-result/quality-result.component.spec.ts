import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QualityResultComponent } from './quality-result.component';

describe('QualityResultComponent', () => {
  let component: QualityResultComponent;
  let fixture: ComponentFixture<QualityResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QualityResultComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QualityResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
