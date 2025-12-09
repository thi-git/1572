import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditArrowComponent } from './edit-arrow.component';

describe('EditArrowComponent', () => {
  let component: EditArrowComponent;
  let fixture: ComponentFixture<EditArrowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditArrowComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditArrowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
