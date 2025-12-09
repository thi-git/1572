import {
  Component,
  Input,
  OnChanges,
  Output,
  EventEmitter,
  NgZone,
} from '@angular/core';

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss'],
})
export class PermissionsComponent implements OnChanges {
  @Input() allPermission: Object[];
  @Input() disable: boolean = false;
  @Output() selected = new EventEmitter<Object[]>();
  init: any[] = [
    {
      value: 'view',
      label: '資料檢視及下載',
      checked: false,
      indeterminate: false,
      sub: [],
    },
    {
      value: 'setting',
      label: '路口資料管理及維護',
      checked: false,
      indeterminate: false,
      sub: [],
    },
    {
      value: 'back',
      label: '後台資料管理',
      checked: false,
      indeterminate: false,
      sub: [],
    }
  ];

  constructor(private zone: NgZone) { }

  ngOnChanges(changes): void {
    if (changes.allPermission.currentValue.length) {
      this.allPermission = changes.allPermission.currentValue;
      this.init.forEach((el) => {
        el.sub = [];
        // 資料檢視及下載
        if (el.value == 'view') {
          const order = ['search', 'analyze', 'db_search', 'quality'];
          el.sub = this.allPermission
            .filter(
              (item) =>
                item['name'] === 'search' ||
                item['name'] === 'analyze' ||
                item['name'] === 'db_search' ||
                item['name'] === 'quality'
            )
            .map((item) => ({ ...item }))
            .sort((a, b) => {
              return order.indexOf(a['name']) - order.indexOf(b['name']);
            });
        }
        // 路口資料管理及維護
        else if (el.value == 'setting') {
          const order = ['download', 'upload', 'edit', 'list_manage'];
          el.sub = this.allPermission
            .filter(
              (item) =>
                item['name'] === 'download' ||
                item['name'] === 'upload' ||
                item['name'] === 'edit' ||
                item['name'] === 'list_manage'
            )
            .map((item) => ({ ...item }))
            .sort((a, b) => {
              return order.indexOf(a['name']) - order.indexOf(b['name']);
            });
        }
        // 後台資料管理
        else if (el.value == 'back') {
          const order = ['list_manage'];
          el.sub = this.allPermission
            .filter(
              (item) =>
                item['name'] === 'list_manage')
            .map((item) => ({ ...item }))
            .sort((a, b) => {
              return order.indexOf(a['name']) - order.indexOf(b['name']);
            });
        }


        // 判斷已選擇的權限
        if (el.sub.every((item) => !item.checked)) {
          el.checked = false;
          el.indeterminate = false;
        } else if (el.sub.every((item) => item.checked)) {
          el.checked = true;
          el.indeterminate = false;
        } else {
          el.indeterminate = true;
        }
      });
    }
  }

  // 全選
  updateAllChecked(value): void {
    this.init.forEach((el) => {
      if (el.value == value) {
        el.indeterminate = false;
        el.sub.map((item) => (item.checked = el.checked));
      }
    });
    // 權限整理成陣列
    this.checkPage();
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
    // 權限整理成陣列
    this.checkPage();
  }

  // 確認選取的內容
  checkPage() {
    // let permission = [];
    // // 權限整理成陣列
    // this.init.forEach((el) => {
    //   el.sub.forEach(el => {
    //     if(el.checked) {
    //       permission.push(el)
    //     }
    //   })
    // })
    const permission = this.init.flatMap((el) =>
      el.sub.filter((item) => item.checked)
    );
    this.selected.emit(permission);
  }
}
