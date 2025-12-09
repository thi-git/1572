import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListManageSubpageComponent } from './list-manage-subpage.component';

describe('ListManageSubpageComponent', () => {
  let component: ListManageSubpageComponent;
  let fixture: ComponentFixture<ListManageSubpageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListManageSubpageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ListManageSubpageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
