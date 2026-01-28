import { CenterService } from 'src/app/pages/center.service';
import { Component, OnInit } from '@angular/core';
import { format } from 'date-fns';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { forkJoin } from 'rxjs';
import { AccountSettingComponent } from './dialog/account-setting/account-setting.component';
import { ApiService } from './../../../api.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit {
  dataSet = [];
  dataColumn = [
    {
      title: '序號',
      // compare: (a: any, b: any) => a.idx - b.idx,
      priority: false,
    },
    {
      title: '帳號',
      // compare: (a: any, b: any) => a.username.localeCompare(b.username),
      priority: false,
    },
    {
      title: '姓名',
      // compare: (a: any, b: any) => a.name.localeCompare(b.name),
      priority: false,
    },
    {
      title: '群組',
      // compare: (a: any, b: any) => a.groupName.localeCompare(b.groupName),
      priority: false,
    },
    {
      title: '角色',
      // compare: (a: any, b: any) => a.roleName.localeCompare(b.roleName),
      priority: false,
    },
    {
      title: '編輯',
      // compare: (a: any, b: any) => 0,
      priority: false,
    },
    {
      title: '更新時間',
      // compare: (a: any, b: any) => a.updatetime - b.updatetime,
      priority: false,
    },
  ];
  widthConfig: string[] = ['100px'];
  scrollY: string = 'calc(100vh - 330px)';

  constructor(
    private apiService: ApiService,
    private modalService: NzModalService,
    private centerService: CenterService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.init();
  }
  /** Function **/
  init() {
    const promise = new Promise((resolve, reject) => {
      this.apiService.get_auth('/admin/realms/1572/users').then((users) => {
        // Create an array of Observables that make HTTP requests for each user's groups
        const observables = users.map((user) =>
          this.apiService.get_auth(`/admin/realms/1572/users/${user.id}/groups`)
        );
        // Use forkJoin to wait for all HTTP requests to complete
        forkJoin(observables).subscribe((responses: any) => {
          // Combine the user and group data into a single dataSet array
          const dataSet = users.map((user, idx) => ({
            idx: idx + 1,
            id: user.id,
            username: user.username,
            name: user.firstName + user.lastName || '',
            roleId: (responses[idx][0] && responses[idx][0].id) || '',
            groupName:
              (responses[idx][0] && responses[idx][0].path.split('/')[1]) || '',
            roleName:
              (responses[idx][0] && responses[idx][0].path.split('/')[2]) || '',
            updatetime: format(user.createdTimestamp, 'yyyy/MM/dd  HH:mm:ss'),
          }));
          resolve(this.sort(dataSet));
        }, reject);
      });
    });

    promise.then((data: any) => {
      this.dataSet = data;
    });
  }

  // 新增帳號
  create() {
    const modalRef = this.modalService.create({
      nzWidth: '850px',
      nzTitle: '新增帳號',
      nzClosable: false,
      nzFooter: null,
      nzContent: AccountSettingComponent,
      nzComponentParams: {},
    });
    modalRef.afterClose.subscribe((result) => {
      if (result == 'ok') {
        this.init();
      }
    });
  }

  // 編輯帳號
  edit(user) {
    let userData = {};
    userData = {
      userId: user.id,
      account: user.username,
      name: user.name,
      roleId: user.roleId,
      group: user.groupName,
      role: user.roleName,
    };
    const modalRef = this.modalService.create({
      nzWidth: '850px',
      nzTitle: '編輯帳號',
      nzClosable: false,
      nzFooter: null,
      nzContent: AccountSettingComponent,
      nzComponentParams: { userData: userData },
    });
    modalRef.afterClose.subscribe((result) => {
      if (result == 'ok') {
        this.init();
      }
    });
  }

  // 刪除帳號
  delete(user) {
    const user_record = {
      item: '新增/編輯/刪除帳號', //紀錄項目
      content: `刪除帳號`, //使用功能(顯示文字)
    };
    this.apiService
      .delete_auth('/admin/realms/1572/users/' + user.id)
      .then((res) => {
        if (!res) {
          // this.apiService.user_record(user_record);
          this.init();
        }
      });
  }

  // 重置密碼
  reset(user) {
    this.apiService
      .put_auth('/admin/realms/1572/users/' + user.id + '/reset-password', {
        temporary: true,
        type: 'password',
        value: user.username,
      })
      .then((res) => {
        if (!res) {
          this.message.create('success', `重置成功`);
        }
      });
  }

  // 排序
  sort(data) {
    data = data.sort((a, b) => {
      return a.idx > b.idx ? 1 : -1;
    });
    return data;
  }
}
