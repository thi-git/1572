import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { format } from 'date-fns';
// api
import { ApiService } from 'src/app/pages/api.service';
@Component({
  selector: 'app-group-setting',
  templateUrl: './group-setting.component.html',
  styleUrls: ['./group-setting.component.scss'],
})
export class GroupSettingComponent implements OnInit {
  data; // 群組資料
  validateForm!: FormGroup;
  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private modalRef: NzModalRef,
    private message: NzMessageService
  ) {
    this.validateForm = this.fb.group({
      name: [null, [Validators.required]],
      description: [null],
    });
  }
  ngOnInit(): void {
    if (this.data) {
      this.validateForm.setValue({
        name: this.data.groupName,
        description: (this.data.description && this.data.description[0]) || '',
      });
    }
  }
  /** Function **/
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
  }
  // 取消
  cancel() {
    this.modalRef.close();
  }

  // 新增群組
  create(value) {
    let res = {
      name: value.name,
      attributes: {
        description: [value.description],
        updatetime: [format(new Date(), 'yyyy/MM/dd  HH:mm:ss')],
      },
    };
    const user_record = {
      item: '新增/編輯/刪除群組', //紀錄項目
      content: `新增群組`, //使用功能(顯示文字)
    };
    this.apiService.post_auth('/admin/realms/1493/groups', res).then((res) => {
      if (!res) {
        // this.apiService.user_record(user_record);
        this.message.create('success', '新增群組成功');
        this.modalRef.close('ok');
      }
    });
  }

  // 編輯群組
  edit(value) {
    let res = {
      name: value.name,
      attributes: {
        description: [value.description],
        updatetime: [format(new Date(), 'yyyy/MM/dd  HH:mm:ss')],
      },
    };
    const user_record = {
      item: '新增/編輯/刪除群組', //紀錄項目
      content: `編輯群組`, //使用功能(顯示文字)
    };
    this.apiService
      .put_auth('/admin/realms/1493/groups/' + this.data.id, res)
      .then((res) => {
        if (!res) {
          // this.apiService.user_record(user_record);
          this.message.create('success', '編輯完成');
          this.modalRef.close('ok');
        }
      });
  }
}
