import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DbSearchComponent } from './db-search.component';

const routes: Routes = [
  {
    path: '',
    component: DbSearchComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DbSearchRoutingModule { }
