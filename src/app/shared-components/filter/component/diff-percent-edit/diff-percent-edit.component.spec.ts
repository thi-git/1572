import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiffPercentEditComponent } from './diff-percent-edit.component';

describe('DiffPercentEditComponent', () => {
  let component: DiffPercentEditComponent;
  let fixture: ComponentFixture<DiffPercentEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiffPercentEditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DiffPercentEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
