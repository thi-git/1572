import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UploadComponent } from './upload.component';
import { UploadRoutingModule } from './upload-routing.module';
import { SharedComponentsModule } from 'src/app/shared-components/shared-components.module';

@NgModule({
  declarations: [ UploadComponent ],
  imports: [
    CommonModule,
    UploadRoutingModule,
    SharedComponentsModule,
    FormsModule
  ]
})
export class UploadModule { }
