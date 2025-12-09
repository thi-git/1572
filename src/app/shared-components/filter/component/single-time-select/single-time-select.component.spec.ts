import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SingleTimeSelectComponent } from './single-time-select.component';

describe('SingleTimeSelectComponent', () => {
  let component: SingleTimeSelectComponent;
  let fixture: ComponentFixture<SingleTimeSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SingleTimeSelectComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SingleTimeSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
