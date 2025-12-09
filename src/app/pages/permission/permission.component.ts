import { Component } from '@angular/core';

@Component({
  selector: 'app-permission',
  templateUrl: './permission.component.html',
  styleUrls: ['./permission.component.scss'],
})
export class PermissionComponent {
  // 預設為帳號列表
  tableName: string = 'account';
  btnList = [
    {
      name: '帳號列表',
      value: 'account',
      clicked: true,
    },
    {
      name: '群組管理',
      value: 'group',
      clicked: false,
    },
    {
      name: '角色管理',
      value: 'role',
      clicked: false,
    },
  ];

  /** Function **/
  changeTable(value:string) {
    this.tableName = value;
    this.btnList = this.btnList.map(el => ({
      ...el,
      clicked: el.value === value
    }));
  }
}
