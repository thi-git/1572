import { NgModule } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';

@NgModule({
  exports: [
    NzTableModule,
    NzCascaderModule,
    NzSelectModule,
    NzMessageModule,
    NzModalModule,
    NzFormModule,
    NzPopconfirmModule,
    NzCheckboxModule,
    NzTimePickerModule
  ]
})
export class NgZorroAntdModule { }
