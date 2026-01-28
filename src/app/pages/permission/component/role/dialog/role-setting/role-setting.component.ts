import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { format } from 'date-fns';
// api
import { ApiService } from 'src/app/pages/api.service';

@Component({
  selector: 'app-role-setting',
  templateUrl: './role-setting.component.html',
  styleUrls: ['./role-setting.component.scss'],
})
export class RoleSettingComponent implements OnInit {
  roleData; //角色資料
  data; // 角色權限資料
  groups: object[] = []; // 群組資料
  permission: Object[] = []; //所有權限
  adminPermission: Object[] = []; //所有權限(admin)
  validateForm!: FormGroup;
  originData; // 原始權限設定資料
  selected; // 權限設定資料
  groupByData; //groupBy
  constructor(
    private apiService: ApiService,
    private zone: NgZone,
    private fb: FormBuilder,
    private modalRef: NzModalRef,
    private message: NzMessageService
  ) {
    this.validateForm = this.fb.group({
      name: [null, [Validators.required]],
      group: [null, [Validators.required]],
      description: [null],
    });
  }

  ngOnInit(): void {
    if (this.roleData) {
      this.validateForm.setValue({
        name: this.roleData.name,
        group: this.groups.filter(
          (item) => item['name'] == this.roleData.group
        )[0]['id'],
        description: this.roleData.description,
      });
      this.validateForm.get('group').disable();
    }
    // 取得所有client資訊
    this.apiService
      .get_auth(`/admin/realms/1572/clients?clientId=1572web&search=true`)
      .then((res) => {
        this.getRoles(res);
      });

    // 取得realm-management資訊
    this.apiService
      .get_auth(
        `/admin/realms/1572/clients?clientId=realm-management&search=true`
      )
      .then((res) => {
        this.getAdminRoles(res);
      });
  }
  /** Function **/
  // 取得所有roles
  getRoles(data) {
    this.permission = [];
    let permission = [];
    data.forEach((el) => {
      //  取得client中的角色資訊
      this.apiService
        .get_auth(`/admin/realms/1572/clients/${el.id}/roles`)
        .then((res) => {
          if (res.length) {
            res.forEach((e) => {
              permission.push({
                client_uid: el.id,
                clientId: el.clientId,
                label: e.description || e.name || '',
                name: e.name,
                value: e.id,
                checked: false,
              });
            });

            if (this.data) {
              this.data.forEach((item) => {
                permission.forEach((val) => {
                  if (item.clientId == val.clientId && item.label == val.name) {
                    val.checked = true;
                  }
                });
              });
              this.permission = permission;
              this.filterCheck(this.permission);
            } else {
              this.permission = permission;
            }
          }
        });
    });
  }
  // 取得使用者資訊權限
  getAdminRoles(data) {
    data.forEach((el) => {
      //  取得client中的角色資訊
      this.apiService
        .get_auth(`/admin/realms/1572/clients/${el.id}/roles`)
        .then((res) => {
          if (res.length) {
            this.adminPermission = res
              .filter(
                (item) =>
                  item.name == 'view-events' || item.name == 'view-users'
              )
              .map((e) => {
                return {
                  client_uid: e.containerId,
                  id: e.id,
                  name: e.name,
                };
              });
          }
        });
    });
  }
  // 取得選擇的roles
  getSelected(data) {
    this.selected = [];
    data.forEach((e) => {
      this.selected.push({
        client_uid: e.client_uid,
        value: e.value,
        label: e.label,
        name: e.name,
      });
    });
  }
  // 篩選掉check = false
  filterCheck(data) {
    this.selected = [];
    this.selected = data.filter((item) => item.checked == true);
    this.originData = data.filter((item) => item.checked == true);
  }
  // 確定
  submitForm(): void {
    if (this.validateForm.valid) {
      if (this.data) {
        this.edit(this.validateForm.value);
      } else {
        this.create(this.validateForm.value);
      }
    } else {
      Object.values(this.validateForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
    // this.modalRef.close();
  }
  // 取消
  cancel() {
    this.modalRef.close();
  }

  // 新增角色
  create(value) {
    let success = 0;
    let id = value.group;
    let res = {
      name: value.name,
      attributes: {
        description: [value.description],
        updatetime: [format(new Date(), 'yyyy/MM/dd  HH:mm:ss')],
      },
    };
    const user_record = {
      item: '新增/編輯/刪除角色', //紀錄項目
      content: `新增角色`, //使用功能(顯示文字)
    };

    this.apiService
      .post_auth(`/admin/realms/1572/groups/${id}/children`, res)
      .then((res) => {
        if (res) {
          Object.keys(this.groupByUid(this.selected)).forEach((el) => {
            let body = [];
            this.groupByUid(this.selected)[el].forEach((e) => {
              if (e.name == 'usage') {
                this.adminCreate(res.id, this.groupByUid(this.adminPermission))
              }
              body.push({
                id: e.value,
                name: e.name,
              });
            });
            this.apiService
              .post_auth(
                `/admin/realms/1572/groups/${res.id}/role-mappings/clients/${el}`,
                body
              )
              .then((res) => {
                if (!res) {
                  success += 1;
                  if (
                    Object.keys(this.groupByUid(this.selected)).length ==
                    success
                  ) {
                    // this.apiService.user_record(user_record);
                    this.message.create('success', '新增角色成功');
                    this.modalRef.close('ok');
                  }
                }
              });
          });
        }
      });
  }

  // 編輯角色
  edit(value) {
    let success = 0;
    let res_body = {
      name: value.name,
      attributes: {
        description: [value.description],
        updatetime: [format(new Date(), 'yyyy/MM/dd  HH:mm:ss')],
      },
    };

    // 修改角色名稱
    this.apiService
      .put_auth(`/admin/realms/1572/groups/${this.roleData.id}`, res_body)
      .then((res) => {
        if (!res) {
          this.originData.forEach((e) => {
            let body = [];
            if (e.name == 'usage') {
              this.adminDelete(this.roleData.id, this.groupByUid(this.adminPermission))
            }
            body.push({
              id: e.value,
              name: e.name,
            });
            // 先刪除角色的全部權限
            this.apiService
              .delete_auth(
                `/admin/realms/1572/groups/${this.roleData.id}/role-mappings/clients/${e.client_uid}`,
                body
              )
              .then((res) => {
                if (!res) {
                  success += 1;
                  if (this.originData.length == success) {
                    this.editCreate();
                  }
                }
              });
          });
        }
      });
  }
  // 處理admin權限
  adminCreate(groupID, data) {
    // http://220.130.185.37:8081/dev_auth/admin/realms/1572/groups/edba79b5-742a-4372-8d42-7bd383fd3d9b/role-mappings/clients/2b360470-3d19-4cf5-a4d8-4ac4734551c2
    //   {
    //     "id": "55282e34-d62d-4e97-88a8-39a73081172f",
    //     "name": "view-events",
    //     "description": "${role_view-events}"
    // }
    Object.keys(data).forEach((el) => {
      let body = [];
      data[el].forEach((e) => {
        body.push({
          id: e.id,
          name: e.name,
        });
      })
      this.apiService
      .post_auth(
        `/admin/realms/1572/groups/${groupID}/role-mappings/clients/${el}`,
        body
      )
      .then((res) => {
        if (!res) {
          console.log('success');
        }
      })
    })

  }
  adminDelete(groupID, data) {
    Object.keys(data).forEach((el) => {
      let body = [];
      data[el].forEach((e) => {
        body.push({
          id: e.id,
          name: e.name,
        });
      })
      this.apiService
      .delete_auth(
        `/admin/realms/1572/groups/${groupID}/role-mappings/clients/${el}`,
        body
      )
      .then((res) => {
        if (!res) {
          console.log('delete success');
        }
      });
    })
  }
  // 編輯新增
  editCreate() {
    const user_record = {
      item: '新增/編輯/刪除角色', //紀錄項目
      content: `編輯角色`, //使用功能(顯示文字)
    };
    let success = 0;
    this.selected.forEach((e) => {
      let body = [];
      if (e.name == 'usage') {
        this.adminCreate(this.roleData.id, this.groupByUid(this.adminPermission))
      }
      body.push({
        id: e.value,
        name: e.name,
      });
      this.apiService
        .post_auth(
          `/admin/realms/1572/groups/${this.roleData.id}/role-mappings/clients/${e.client_uid}`,
          body
        )
        .then((res) => {
          if (!res) {
            success += 1;
            if (this.selected.length == success) {
              // this.apiService.user_record(user_record);
              this.message.create('success', '編輯完成');
              this.modalRef.close('ok');
            }
          }
        });
    });
  }
  // 群組 by client_uid
  groupByUid(data) {
    //按照日期group by
    this.groupByData = data.reduce((group, product) => {
      const { client_uid } = product;
      group[client_uid] = group[client_uid] || [];
      group[client_uid].push(product);
      return group;
    }, {});
    return this.groupByData;
  }
}
