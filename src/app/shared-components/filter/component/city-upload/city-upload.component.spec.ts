import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityUploadComponent } from './city-upload.component';

describe('CityUploadComponent', () => {
  let component: CityUploadComponent;
  let fixture: ComponentFixture<CityUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CityUploadComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CityUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
