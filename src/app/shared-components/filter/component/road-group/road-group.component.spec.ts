import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoadGroupComponent } from './road-group.component';

describe('RoadGroupComponent', () => {
  let component: RoadGroupComponent;
  let fixture: ComponentFixture<RoadGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RoadGroupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RoadGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
