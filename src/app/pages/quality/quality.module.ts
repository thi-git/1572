import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QualityComponent } from './quality.component';
import { QualityRoutingModule } from './quality-routing.module';
import { SharedComponentsModule } from 'src/app/shared-components/shared-components.module';

@NgModule({
  declarations: [
    QualityComponent
  ],
  imports: [
    CommonModule,
    QualityRoutingModule,
    SharedComponentsModule
  ]
})
export class QualityModule { }
