import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SingleDateSelectComponent } from './single-date-select.component';

describe('SingleDateSelectComponent', () => {
  let component: SingleDateSelectComponent;
  let fixture: ComponentFixture<SingleDateSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SingleDateSelectComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SingleDateSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
