import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbSearchComponent } from './db-search.component';
import { DbSearchRoutingModule } from './db-search-routing.module';
import { SharedComponentsModule } from 'src/app/shared-components/shared-components.module';

@NgModule({
  declarations: [
    DbSearchComponent
  ],
  imports: [
    CommonModule,
    DbSearchRoutingModule,
    SharedComponentsModule
  ]
})
export class DbSearchModule { }
