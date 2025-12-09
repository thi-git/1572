import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyzeRoutingModule } from './analyze-routing.module';
import { AnalyzeComponent } from './analyze.component';
import { SharedComponentsModule } from 'src/app/shared-components/shared-components.module';

@NgModule({
  declarations: [
    AnalyzeComponent
  ],
  imports: [
    CommonModule,
    AnalyzeRoutingModule,
    SharedComponentsModule
  ]
})
export class AnalyzeModule { }
