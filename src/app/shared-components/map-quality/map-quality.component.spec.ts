import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapQualityComponent } from './map-quality.component';

describe('MapQualityComponent', () => {
  let component: MapQualityComponent;
  let fixture: ComponentFixture<MapQualityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MapQualityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MapQualityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
