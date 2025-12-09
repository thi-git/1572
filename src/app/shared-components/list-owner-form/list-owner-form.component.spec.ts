import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListOwnerFormComponent } from './list-owner-form.component';

describe('ListOwnerFormComponent', () => {
  let component: ListOwnerFormComponent;
  let fixture: ComponentFixture<ListOwnerFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListOwnerFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ListOwnerFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
