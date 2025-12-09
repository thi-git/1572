import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrawingInfoComponent } from './drawing-info.component';

describe('DrawingInfoComponent', () => {
  let component: DrawingInfoComponent;
  let fixture: ComponentFixture<DrawingInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DrawingInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DrawingInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
