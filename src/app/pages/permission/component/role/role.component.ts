import { filter } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import { format } from 'date-fns';
import { NzModalService } from 'ng-zorro-antd/modal';
import { forkJoin } from 'rxjs';
// dialog
// import { CheckComponent } from 'src/app/shared-components/dialog/check/check.component';
import { RoleSettingComponent } from './dialog/role-setting/role-setting.component';
// api
import { ApiService } from 'src/app/pages/api.service';
import { CenterService } from 'src/app/pages/center.service';

@Component({
  selector: 'app-role',
  templateUrl: './role.component.html',
  styleUrls: ['./role.component.scss'],
})
export class RoleComponent implements OnInit {
  dataSet = [];
  groups: object[] = [];
  dataColumn = [
    {
      title: '序號',
      compare: (a: any, b: any) => a.idx - b.idx,
      priority: false,
    },
    {
      title: '群組',
      // compare: (a: any, b: any) => a.groupName.localeCompare(b.groupName),
      // priority: false,
    },
    {
      title: '角色',
      // compare: (a: any, b: any) => a.roleName.localeCompare(b.roleName),
      priority: false,
    },
    {
      title: '備註',
      // compare: (a: any, b: any) => a.description.localeCompare(b.description),
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
  scrollY: string = '480px';
  constructor(
    private apiService: ApiService,
    private modalService: NzModalService,
    private centerService: CenterService,
  ) {}
  ngOnInit(): void {
    this.init();
  }
  /** Function **/
  init() {
    // this.apiService
    //   .get_auth('/admin/realms/1572/groups?briefRepresentation=false')
    //   .then((res) => {
    //     console.log(res);
    //     const subGroups = res
    //       .filter((el) => el.subGroups.length > 0)
    //       .flatMap((el) => el.subGroups);

    //     this.dataSet = subGroups.map(({ id, path, attributes }, idx) => ({
    //       id,
    //       idx: idx + 1, // 序號從1開始，所以索引+1
    //       groupName: path.split('/')[1],
    //       roleName: path.split('/')[2],
    //       description: attributes.description,
    //       updatetime: attributes.updatetime,
    //     }));
    //     this.groups = res.map(({ id, name }) => ({ id, name }));
    //   });

      const promise = new Promise((resolve, reject) => {
        this.apiService.get_auth('/admin/realms/1572/groups').then((users) => {
          // Create an array of Observables that make HTTP requests for each user's groups
          const observables = users.map((user) =>
            this.apiService.get_auth(`/admin/realms/1572/groups/${user.id}/children`)
          );
          // Use forkJoin to wait for all HTTP requests to complete
          forkJoin(observables).subscribe((responses: any) => {
            const subGroups = responses
            .filter((el) => el.length > 0)
            .flatMap((el) => el);
            // Combine the user and group data into a single dataSet array
            const data = subGroups.map(({ id, path, attributes }, idx) => ({
              id,
              idx: idx + 1, // 序號從1開始，所以索引+1
              groupName: path.split('/')[1],
              roleName: path.split('/')[2],
              description: attributes.description,
              updatetime: attributes.updatetime,
            }));
            this.groups = users.map(({ id, name }) => ({ id, name }));
            resolve(data);
          }, reject);
        });
      })

      promise.then((data: any) => {
        this.dataSet = data;
      });
  }
  // 新增角色
  create() {
    const modalRef = this.modalService.create({
      nzWidth: '850px',
      nzTitle: '新增角色',
      nzClosable: false,
      nzFooter: null,
      nzContent: RoleSettingComponent,
      nzComponentParams: { groups: this.groups },
    });
    modalRef.afterClose.subscribe((result) => {
      if (result == 'ok') {
        this.init();
      }
    });
  }
  // 編輯角色
  edit(role) {
    let datas = [];
    let roleData = {};
    roleData = {
      id: role.id,
      groupId: this.groups.filter((item) => item['name'] == role.groupName)[0][
        'id'
      ],
      name: role.roleName,
      group: role.groupName,
      description: role.description ? role.description[0] : '',
    };
    this.apiService
      .get_auth(`/admin/realms/1572/groups/${role.id}`)
      .then((res) => {
        datas = Object.entries(res.clientRoles).map(([clientId, roles]) =>
          (roles as Array<any>).map((role) => ({
            clientId,
            label: role,
            checked: true,
          }))
        );

        const filteredDatas = datas
          .flat() // 將嵌套的陣列平鋪成一個單一的陣列
          .filter((item) => item.clientId === '1572web');
        const modalRef = this.modalService.create({
          nzWidth: '850px',
          nzTitle: '編輯角色',
          nzClosable: false,
          nzFooter: null,
          nzContent: RoleSettingComponent,
          nzComponentParams: {
            groups: this.groups,
            roleData: roleData,
            data: filteredDatas,
          },
        });

        modalRef.afterClose.subscribe((result) => {
          if (result == 'ok') {
            this.init();
          }
        });
      });
  }
  // 刪除角色
  delete(role) {
    const user_record = {
      item: '新增/編輯/刪除角色', //紀錄項目
      content: `刪除角色`, //使用功能(顯示文字)
    };
    this.apiService
      .delete_auth('/admin/realms/1572/groups/' + role.id)
      .then((res) => {
        if (!res) {
          // this.apiService.user_record(user_record);
          this.init();
        }
      });
  }
}
