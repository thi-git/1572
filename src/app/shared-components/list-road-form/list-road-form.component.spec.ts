import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListRoadFormComponent } from './list-road-form.component';

describe('ListRoadFormComponent', () => {
  let component: ListRoadFormComponent;
  let fixture: ComponentFixture<ListRoadFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListRoadFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ListRoadFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
