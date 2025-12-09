import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PermissionComponent } from './permission.component';
import { PermissionRoutingModule } from './permission-routing.module';
import { SharedComponentsModule } from 'src/app/shared-components/shared-components.module';
import { AccountComponent } from './component/account/account.component';
import { GroupComponent } from './component/group/group.component';
import { RoleComponent } from './component/role/role.component';
import { FormsModule } from '@angular/forms';
// dialog
import { AccountSettingComponent } from './component/account/dialog/account-setting/account-setting.component';
import { GroupSettingComponent } from './component/group/dialog/group-setting/group-setting.component';
import { RoleSettingComponent } from './component/role/dialog/role-setting/role-setting.component';
import { ReactiveFormsModule } from '@angular/forms';
// material
import { MatRadioModule } from '@angular/material/radio';

@NgModule({
  declarations: [PermissionComponent,AccountComponent,AccountSettingComponent,GroupComponent,GroupSettingComponent,RoleComponent,RoleSettingComponent],
  imports: [
    CommonModule,
    PermissionRoutingModule,
    SharedComponentsModule,
    ReactiveFormsModule,
    FormsModule,
    MatRadioModule
  ]
})
export class PermissionModule { }
