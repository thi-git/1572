import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListManageComponent } from './list-manage.component';
import { ListManageRoutingModule } from './list-manage-routing.module';
import { SharedComponentsModule } from 'src/app/shared-components/shared-components.module';

@NgModule({
  declarations: [
    ListManageComponent
  ],
  imports: [
    CommonModule,
    ListManageRoutingModule,
    SharedComponentsModule
  ]
})
export class ListManageModule { }
