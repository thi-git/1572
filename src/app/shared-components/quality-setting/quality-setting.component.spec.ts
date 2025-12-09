import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QualitySettingComponent } from './quality-setting.component';

describe('QualitySettingComponent', () => {
  let component: QualitySettingComponent;
  let fixture: ComponentFixture<QualitySettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QualitySettingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QualitySettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
