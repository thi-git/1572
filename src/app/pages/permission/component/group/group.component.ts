import { Component, OnInit } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
// dialog
// import { CheckComponent } from 'src/app/shared-components/dialog/check/check.component';
import { GroupSettingComponent } from './dialog/group-setting/group-setting.component';
// api
import { ApiService } from 'src/app/pages/api.service';
import { CenterService } from 'src/app/pages/center.service';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
})
export class GroupComponent implements OnInit {
  dataSet = [];
  dataColumn = [
    {
      title: '序號',
      // compare: (a: any, b: any) => a.idx - b.idx,
      priority: false,
    },
    {
      title: '群組',
      // compare: (a: any, b: any) => a.groupName.localeCompare(b.groupName),
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
    this.apiService
      .get_auth('/admin/realms/1572/groups?briefRepresentation=false')
      .then((res) => {
        this.dataSet = res.map((el, idx) => ({
          idx: idx + 1,
          id: el.id,
          groupName: el.name,
          description: el.attributes.description,
          updatetime: el.attributes.updatetime,
        }));
      });
  }
  // 新增群組
  create() {
    const modalRef = this.modalService.create({
      nzWidth: '850px',
      nzTitle: '新增群組',
      nzClosable: false,
      nzFooter: null,
      nzContent: GroupSettingComponent,
      nzComponentParams: {},
    });

    modalRef.afterClose.subscribe((result) => {
      if (result == 'ok') {
        this.init();
      }
    });
  }
  // 編輯群組
  edit(group) {
    const modalRef = this.modalService.create({
      nzWidth: '850px',
      nzTitle: '編輯群組',
      nzClosable: false,
      nzFooter: null,
      nzContent: GroupSettingComponent,
      nzComponentParams: { data: group },
    });

    modalRef.afterClose.subscribe((result) => {
      if (result == 'ok') {
        this.init();
      }
    });
  }
  // 刪除群組
  delete(group) {
    const user_record = {
      item: '新增/編輯/刪除群組', //紀錄項目
      content: `刪除群組`, //使用功能(顯示文字)
    };
    this.apiService
      .delete_auth('/admin/realms/1572/groups/' + group.id)
      .then((res) => {
        if (!res) {
          // this.apiService.user_record(user_record);
          this.init();
        }
      });
  }
}
