import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityAllComponent } from './city-all.component';

describe('CityAllComponent', () => {
  let component: CityAllComponent;
  let fixture: ComponentFixture<CityAllComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CityAllComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CityAllComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
