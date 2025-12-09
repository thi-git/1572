import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapSmallCardComponent } from './map-small-card.component';

describe('MapSmallCardComponent', () => {
  let component: MapSmallCardComponent;
  let fixture: ComponentFixture<MapSmallCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MapSmallCardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MapSmallCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
