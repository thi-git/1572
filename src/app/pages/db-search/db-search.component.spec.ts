import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbSearchComponent } from './db-search.component';

describe('DbSearchComponent', () => {
  let component: DbSearchComponent;
  let fixture: ComponentFixture<DbSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DbSearchComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
