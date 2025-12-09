import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapAnalyzeComponent } from './map-analyze.component';

describe('MapAnalyzeComponent', () => {
  let component: MapAnalyzeComponent;
  let fixture: ComponentFixture<MapAnalyzeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MapAnalyzeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MapAnalyzeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
