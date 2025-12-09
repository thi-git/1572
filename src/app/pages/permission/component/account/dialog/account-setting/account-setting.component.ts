import { Component, OnInit } from '@angular/core';
import { format } from 'date-fns';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { forkJoin } from 'rxjs';
// service
import { ApiService } from '../../../../../api.service';
import { CenterService } from 'src/app/pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';

@Component({
  selector: 'app-account-setting',
  templateUrl: './account-setting.component.html',
  styleUrls: ['./account-setting.component.scss'],
})
export class AccountSettingComponent implements OnInit {
  userData; // 使用者資料
  data; // 權限資料
  groups: object[] = []; // 群組資料
  subGroups: object[] = []; // 角色資料
  permission: Object[] = []; //權限
  allPermission: Object[] = []; //權限
  validateForm!: FormGroup;
  roles: object;
  selected; //選擇的角色id
  origin; // 原本的角色id

  // 資料權限設定(縣市/業主)
  subPage = 'data'; // 頁面權限/資料權限
  setAuth = {};
  treeListOwner = [];
  isCityData = false;
  isOwnerData = false;

  init: any[] = [
    {
      value: 'view',
      label: '縣市全選',
      checked: false,
      indeterminate: false,
      sub: [],
    },
    {
      value: 'setting',
      label: '業主全選',
      checked: false,
      indeterminate: false,
      sub: [],
    }
  ];

  constructor(
    private apiService: ApiService,
    private centerService:CenterService,
    private authService: AuthService,
    private fb: FormBuilder,
    private modalRef: NzModalRef,
    private message: NzMessageService,
  ) {
    this.validateForm = this.fb.group({
      account: [null, [Validators.required]],
      name: [null, [Validators.required]],
      group: [null, [Validators.required]],
      role: [null, [Validators.required]],
    });
  }

  ngOnInit(): void {
    // 之後改為撈資料
    let city = ['台北市', '新北市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'];
    let owner = ['公路局', '測試'];
    this.init[0]['sub'] = city.map(e => {
      return {
        label: e,
        checked: false
      }
    })
    this.init[1]['sub'] = owner.map(e => {
      return {
        label: e,
        checked: false
      }
    })

    // 取得所有client資訊
    this.apiService
      .get_auth(`/admin/realms/1493/clients?clientId=1493web&search=true`)
      .then((res) => {
        this.getRoles(res);
      });

    const promise = new Promise((resolve, reject) => {
      this.apiService.get_auth('/admin/realms/1493/groups').then((users) => {
        // Create an array of Observables that make HTTP requests for each user's groups
        const observables = users.map((user) =>
          this.apiService.get_auth(
            `/admin/realms/1493/groups/${user.id}/children`
          )
        );
        // Use forkJoin to wait for all HTTP requests to complete
        forkJoin(observables).subscribe((responses: any) => {
          const data = users.map((item, idx) => {
            return {
              id: item.id,
              name: item.name,
              subGroups: responses[idx],
            };
          });
          resolve(data);
        }, reject);
      });
    });

    promise.then((data: any) => {
      this.groups = data;
      // 編輯帳號
      if (this.userData) {
        this.origin = this.userData.roleId;
        this.selected = this.userData.roleId;
        this.validateForm.get('account')!.disable();
        this.validateForm.setValue({
          account: this.userData.account,
          name: this.userData.name,
          group: this.groups.filter(
            (item) => item['name'] == this.userData.group
          )[0]['id'],
          role: this.groups
            .filter((item) => item['name'] == this.userData.group)[0]
          ['subGroups'].filter((val) => val['name'] == this.userData.role)[0][
            'id'
          ],
        });
        const promise2 = new Promise((resolve, reject) => {
          this.apiService
            .get_auth(`/admin/realms/1493/groups/${this.userData.roleId}`)
            .then((res) => {
              const permission: Object[] = [];
              Object.entries(res.clientRoles).forEach(([clientId, roles]) => {
                (roles as Array<any>).forEach((label) => {
                  permission.push({ clientId, label, checked: true });
                });
              });
              setTimeout(() => {
                resolve(permission);
              }, 500);
            });
        });
        promise2.then((data: any) => {
          this.changePermission(data);
        });

        // 資料權限處理
        this.init[0]['sub'] = city.map(e => {
          return {
            label: e,
            checked: this.centerService.setAuthDataTest['city'].includes(e)
          }
        })
        this.init[1]['sub'] = owner.map(e => {
          return {
            label: e,
            checked: this.centerService.setAuthDataTest['owner'].includes(e)
          }
        })
      }
    });

    this.getStaticData();
  }

  /** Function **/
  async getRoles(data) {
    this.permission = [];
    const permission: Object[] = [];
    try {
      for (const el of data) {
        const res = await this.apiService.get_auth(
          `/admin/realms/1493/clients/${el.id}/roles`
        );
        if (res.length) {
          res.forEach((e) => {
            permission.push({
              client_uid: el.id,
              clientId: el.clientId,
              label: e.description || e.name || '',
              name: e.name,
              value: e.id,
              checked: false,
              disabled: true,
            });
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
    this.allPermission = permission;
    this.permission = permission;
  }

  // 更換群組
  changeGroup(data) {
    this.subGroups = [];
    this.groups.forEach((el) => {
      if (el['id'] == data) {
        this.subGroups = el['subGroups'];
      }
    });
    // 角色預設為Null
    this.validateForm.patchValue({ role: null });
    this.changePermission([]);
  }

  // 更換角色
  changeRole(data) {
    if (data) {
      this.selected = data;
      let permission: object[] = []; // 紀錄角色權限
      this.subGroups.forEach((el) => {
        if (el['id'] == data) {
          this.roles = el['clientRoles'];
          Object.keys(el['clientRoles']).forEach((e) => {
            el['clientRoles'][e].forEach((item) => {
              permission.push({
                clientId: e,
                label: item,
                checked: true,
              });
            });
          });
        }
      });
      this.changePermission(permission);
    }
  }

  // 更換權限
  changePermission(data) {
    this.permission = [];
    setTimeout(() => {
      this.allPermission.forEach((val) => {
        val['checked'] = false;
        data.forEach((item) => {
          if (item.clientId == val['clientId'] && item.label == val['name']) {
            val['checked'] = true;
          }
        });
      });
      this.permission = this.allPermission;
    }, 500);
  }

  // 確定
  submitForm(): void {
    if (this.validateForm.valid) {
      if (this.userData) {
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
  }

  // 取消
  cancel() {
    this.modalRef.close();
  }

  // 新增帳號
  create(value) {
    let groups;
    groups = `/${this.groups.filter((item) => item['id'] == value.group)[0]['name']
      }/${this.subGroups.filter((item) => item['id'] == value.role)[0]['name']}`;
    let res = {
      username: value.account, //登入使用ID
      email: '', //信箱
      firstName: value.name, //姓氏
      lastName: '　', //名字
      enabled: true, //是否啟用
      emailVerified: false, //是否需要驗證信箱
      credentials: [
        { type: 'password', value: value.account, temporary: true },
      ], //設定密碼 temporary->true:第一次登入需要改密碼
      requiredActions: [], //保持空array
      groups: [groups],
      attributes: {
        updatetime: [format(new Date(), 'yyyy/MM/dd  HH:mm:ss')],
        // selectedAuth: this.setAuth // 使用者自行定義
      },
    };
    const user_record = {
      item: '新增/編輯/刪除帳號', //紀錄項目
      content: `新增帳號`, //使用功能(顯示文字)
    };
    this.apiService.post_auth(`/admin/realms/1493/users`, res).then((res) => {
      if (!res) {
        // this.apiService.user_record(user_record);
        this.message.create('success', '新增帳號成功');
        this.modalRef.close('ok');
      }
    });

    // 紀錄該帳號的資料權限
    this.init[0]['sub'].forEach(e => {
      if (e['checked']) {
        if (!this.setAuth['city']) this.setAuth['city'] = [];
        this.setAuth['city'].push(e['label']);
      } else {
      }
    })
    this.init[1]['sub'].forEach(e => {
      if (e['checked']) {
        if (!this.setAuth['owner']) this.setAuth['owner'] = [];
        this.setAuth['owner'].push(e['label']);
      } else {
      }
    })

    let req_body = {
      user_name: value.account,
      selected_auth: this.setAuth
    }
    this.centerService.post('/api/users/create_user_auth', req_body).subscribe({
      next: (res) => {

      },
      error: (err) => {

      }
    });
  }

  // 編輯帳號
  edit(value) {
    let groups;
    groups = `/${this.groups.filter((item) => item['id'] == value.group)[0]['name']
      }/${this.subGroups.filter((item) => item['id'] == value.role)[0]['name']}`;
    let res = {
      username: value.account, //登入使用ID
      email: '', //信箱
      firstName: '', //姓氏
      lastName: value.name, //名字
      enabled: true, //是否啟用
      emailVerified: false, //是否需要驗證信箱
      requiredActions: [], //保持空array
      groups: [groups],
      attributes: {
        updatetime: [format(new Date(), 'yyyy/MM/dd  HH:mm:ss')],
      },
    };
    const user_record = {
      item: '新增/編輯/刪除帳號', //紀錄項目
      content: `編輯帳號`, //使用功能(顯示文字)
    };
    this.apiService
      .put_auth('/admin/realms/1493/users/' + this.userData.userId, res)
      .then((res) => {
        if (!res) {
          // 先刪除角色
          this.apiService
            .delete_auth(
              `/admin/realms/1493/users/${this.userData.userId}/groups/${this.origin}`
            )
            .then((res_user) => {
              if (!res_user) {
                // 新增角色
                this.apiService
                  .put_auth(
                    `/admin/realms/1493/users/${this.userData.userId}/groups/${this.selected}`,
                    {}
                  )
                  .then((res_role) => {
                    if (!res_role) {
                      // this.apiService.user_record(user_record);
                      this.message.create('success', '編輯完成');
                      this.modalRef.close('ok');
                    }
                  });
              }
            });
        }
      });

      // 紀錄該帳號的資料權限
      this.init[0]['sub'].forEach(e => {
        if (e['checked']) {
          if (!this.setAuth['city']) this.setAuth['city'] = [];
          this.setAuth['city'].push(e['label']);
        } else {
        }
      })
      this.init[1]['sub'].forEach(e => {
        if (e['checked']) {
          if (!this.setAuth['owner']) this.setAuth['owner'] = [];
          this.setAuth['owner'].push(e['label']);
        } else {
        }
      })

      let req_body = {
        user_name: this.userData.account,
        selected_auth: this.setAuth
      }
      this.centerService.post('/api/users/update_user_auth', req_body).subscribe({
        next: (res) => {

        },
        error: (err) => {

        }
    });
  }

  changeSubPage(type) {
    this.subPage = type;
  }

  // 取得資料
  getStaticData() {
    let req_body = {"user_name": ""};

    // 取得所有業主靜態資料
    this.centerService.post('/api/owner_project/get_all_project', req_body).subscribe({
      next: (res) => {
        this.treeListOwner = [];
        Object.keys(res['data']).forEach((e) => {
          this.treeListOwner.push({
            text: e,
            value: e,
            collapsed: false,
            children: []
          });
        })
        this.isOwnerData = this.treeListOwner.length > 0 ? true : false;
      },
      error: (err) => {
        console.log(err);
        if(err.error.msg === 'Token has expired') {
          this.authService.signOut(); // token過期登出
        }
      }
    })
  }

  // 全選
  updateAllChecked(value): void {
    this.init.forEach((el) => {
      if (el.value == value) {
        el.indeterminate = false;
        el.sub.map((item) => (item.checked = el.checked));
      }
    });
  }

  // 單選
  updateSingleChecked(value): void {
    this.init.forEach((el) => {
      if (el.value == value) {
        if (el.sub.every((item) => !item.checked)) {
          el.checked = false;
          el.indeterminate = false;
        } else if (el.sub.every((item) => item.checked)) {
          el.checked = true;
          el.indeterminate = false;
        } else {
          el.indeterminate = true;
        }
      }
    });
  }
}
