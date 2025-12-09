import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListManageComponent } from './list-manage.component';

const routes: Routes = [
  {
    path: '',
    component: ListManageComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ListManageRoutingModule { }
