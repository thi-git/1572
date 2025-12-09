import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditParamsComponent } from './edit-params.component';

describe('EditParamsComponent', () => {
  let component: EditParamsComponent;
  let fixture: ComponentFixture<EditParamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditParamsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditParamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
