import { Component, OnInit, Input } from '@angular/core';
import { CenterService } from '../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';
import { ngxCsv } from 'ngx-csv/ngx-csv';

interface DataItem {
  index: number; // 序號
  owner_name: string; // 業主名稱
  project_num: string; // 專案編號
  tc_id: string; // 路口編號
  intersection_name: string; // 路口名稱
  lng: number; // 路口經度
  lat: number; // 路口緯度
  data_type: string; // 資料類型
  holiday_type: string; // 平假日
  date: string; // 資料日期
  download_format: string; // 下載格式
  ischecked: boolean; // 勾選
}

@Component({
  selector: 'app-db-search-form',
  templateUrl: './db-search-form.component.html',
  styleUrls: ['./db-search-form.component.scss']
})
export class DbSearchFormComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @Input() loading: boolean = false;
  @Input() originData!: any[];
  @Input() listOfColumn = []; // 欄位設定
  @Input() listOfData = []; // 資料設定
  @Input() showPagination: boolean = true;
  @Input() pageSize: number = 10; // 每頁可呈現的資料筆數
  @Input() scrollY: string = 'calc(100vh - 420px)';
  @Input() scrollX: string = '1280';
  tableSize = 'default';
  selectCount = 0; // 勾選筆數
  selectFile = [];
  allSelect: boolean = false; // 是否全選
  checkboxType = 'none'; // 預設不勾選
  selectAllFileFormat = '下載檔';
  canDelete: boolean = true;
  week_type = {
    0: '日',
    1: '一',
    2: '二',
    3: '三',
    4: '四',
    5: '五',
    6: '六',
  }

  constructor(
    private centerService: CenterService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.centerService.tcUploadedData$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((res) => {
       // (重新查詢時)恢復預設
      this.selectCount = 0;
      this.selectFile.length = 0;
      this.allSelect = false;
      this.checkboxType = 'none';
      this.selectAllFileFormat = '下載檔';

      let temp = [];
      let addedGroups = {};
      console.log(addedGroups);
      res['tc_uploaded_data'].forEach(item => {
        const groupKey = `${item.tc_id}_${item.date_group}`;
        // 延滯才要過濾掉重複的並且修正日期顯示
        if(item['data_type'] === 'delay') {
          if (!addedGroups[groupKey]) {
            temp.push(item);
            addedGroups[groupKey] = true;
          }
        } else {
          temp.push(item);
        }
      })

      this.listOfData = temp
      .sort((a, b) => Number(a.tc_id.slice(2)) - Number(b.tc_id.slice(2)))
      .map((e, i) => {
        if(e['data_type'] === 'volume') {
          e['data_type'] = '流量';
        } else if (e['data_type'] === 'delay') {
          e['data_type'] = '延滯';
        } else if (e['data_type'] === 'other') {
          e['data_type'] = '其他';
        }
        e['index'] = i + 1;
        e['date'] = `${moment(e['date']).format('YYYY-MM-DD')} (${this.week_type[moment(e['date']).weekday()]})`;
        return e;
      });
    })
  }

  ngOnInit(): void {
    // 之後調整權限
    let userArr = ['admin', 'user1'];
    this.canDelete = userArr.includes(this.centerService.user_name) ? true : false;
    this.listOfColumn = [
      {
        title: '序號',
        value: 'index',
        priority: 1,
        width: '14px'
      },
      {
        title: '業主名稱',
        value: 'owner_name',
        priority: 1,
        width: '20px'
      },
      {
        title: '專案編號',
        value: 'project_num',
        compare: (a: DataItem, b: DataItem) => a.project_num.localeCompare(b.project_num),
        priority: 1,
        width: '20px'
      },
      {
        title: '路口編號',
        value: 'tc_id',
        compare: (a: DataItem, b: DataItem) => a.tc_id.localeCompare(b.tc_id),
        priority: 1,
        width: '20px'
      },
      {
        title: '路口名稱',
        value: 'road',
        priority: 1,
        width: '60px',
      },
      {
        title: '路口經度',
        value: 'lng',
        compare: (a: DataItem, b: DataItem) => a.lng - b.lng,
        priority: 1,
        width: '20px'
      },
      {
        title: '路口緯度',
        value: 'lat',
        compare: (a: DataItem, b: DataItem) => a.lat - b.lat,
        priority: 1,
        width: '20px'
      },
      {
        title: '資料類型',
        value: 'data_type',
        listOfFilter: [
          { text: '流量', value: '流量' },
          { text: '延滯', value: '延滯' }
        ],
        filterFn: (list: string[], item) => list.some((data_type: any) => item.data_type.indexOf(data_type) !== -1),
        filterMultiple: true,
        priority: 1,
        width: '22px'
      },
      {
        title: '平假日',
        value: 'holiday_type',
        listOfFilter: [
          { text: '平日', value: '平日' },
          { text: '一般假日', value: '一般假日' },
          { text: '連續假日', value: '連續假日' }
        ],
        filterFn: (list: string[], item) => list.some((holiday_type: any) => item.holiday_type.indexOf(holiday_type) !== -1),
        filterMultiple: true,
        priority: 1,
        width: '20px'
      },
      {
        title: '調查日期',
        value: 'date',
        compare: (a: DataItem, b: DataItem) => a.date.localeCompare(b.date),
        priority: 1,
        width: '24px'
      },
      {
        title: '下載格式',
        value: 'download_format',
        priority: 1,
        width: '20px'
      },
      {
        title: '',
        value: 'is_checked',
        priority: 1,
        width: '14px'
      },
      {
        title: '內容',
        value: 'commit',
        priority: 1,
        width: '12px'
      }
    ];

    document
      .getElementById('db-search-form')
      .addEventListener('click', (e) => {
        this.centerService.windowClick$.next(true);
      });
  }

  // 是否可以點選全選checkbox
  eventControl() {
    if(this.listOfData.length === 0) {
      return 'no-event';
    }
  }

  // 偵測選取事件
  selectCountChange(e, data) {
    if(e.checked) {
      this.selectCount++;
      this.selectFile.push(data.id);
    } else {
      this.selectCount--;
      this.selectFile = this.selectFile.filter(file => file !== data.id);
    }

    if(this.selectFile.length === 0) {
      this.checkboxType = 'none';
    } else if(this.selectFile.length === this.listOfData.length) {
      this.checkboxType = 'all';
    } else {
      this.checkboxType = 'some';
    }
  }

  // 全選事件
  selectAll(type) {
    if(type === 'all') {
      this.checkboxType = 'all';
      this.selectFile = this.listOfData.map(e => e['id']);
      this.allSelect = true;
      this.selectCount = this.selectFile.length;
    } else if(type === 'none') {
      this.checkboxType = 'none';
      this.selectFile.length = 0;
      this.allSelect = false;
      this.selectCount = 0;
    }
  }

  // 清單下載
  downloadList() {
    let exportList = [];
    this.listOfData.forEach(e => {
      exportList.push({
        index: e['index'],
        owner_name: e['owner_name'],
        project_num: e['project_num'],
        tc_id: e['tc_id'],
        road: e['road'],
        lng: e['lng'],
        lat: e['lat'],
        data_type: e['data_type'],
        holiday_type: e['holiday_type'],
        date: `${e['date']}`.replace(/-/g, '_'), // date: `"${e['date']}"`,
        download_format: e['download_format'],
        commit: e['commit'],
      })
    })

    let now = moment().format('YYYY-MM-DD');
    let header = ['序號', '業主名稱', '專案編號', '路口編號', '路口名稱', '路口經度',
    '路口緯度', '資料類型', '平假日', '調查日期', '下載格式', '內容'];

    let options = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: false,
      showTitle: false,
      title: '',
      useBom: true,
      headers: header
    };

    new ngxCsv(exportList, `清單下載_${now}`, options);
  }

  // 檔案下載
  downloadFile() {
    // 下載格式參數設定
    let data = [];
    this.selectFile.forEach(e => {
      let format = this.listOfData.filter(el => el['id'] === e)[0]['download_format'];
      let formatRes = -1;
      if(format === '下載檔') {
        formatRes = 0;
      } else if(format === '上傳檔') {
        formatRes = 1;
      } else if(format === '其他') {
        formatRes = 0;
      }

      data.push({
        id: e,
        format: formatRes // 下載檔0, 上傳檔1
      })
    })

    let req_body = {
      data: data
    }

    if(this.selectFile.length > 0) {
      if(data.every(k => k.format !== -1)) {
        this.centerService.post('/api/tc/download', req_body).subscribe({
          next: (res)=>{
            window.open(`${environment.serverIP}/res/` + res.folder_path + res.name, '');
          },
          error: (err) => {
            console.log(err);
            if(err.error.msg === 'Token has expired') {
              this.authService.signOut(); // token過期登出
            }
          }
        })
      } else {
        this.remind('下載格式未選', 'red', false);
      }
    } else {
      this.remind('請選擇檔案', 'red', false);
    }
  }

  // 檔案刪除
  deleteFile() {
    let req_body = {
      id: this.selectFile
    }

    if(this.selectFile.length > 0) {
      this.centerService.post('/api/tc/delete', req_body).subscribe({
        next: (res) => {
          this.remind('刪除成功', 'green', true);

          // index重新設定
          this.listOfData = this.listOfData
          .filter((e) => !this.selectFile.includes(e['id']))
          .map((e, i) => {
            e['index'] = i + 1;
            return e;
          });
        },
        error: (err) => {
          console.log(err);
          if(err.error.msg === 'Token has expired') {
            this.authService.signOut(); // token過期登出
          }
        }
      })
    } else {
      this.remind('請選擇檔案', 'red', false);
    }
  }

  // 設定所有資料的下載格式
  selectAllFormat(event) {
    if(event !== null) {
      this.listOfData = this.listOfData.map(e => {
        if(e['data_type'] === '其他') {
          e['download_format'] = '其他';
        } else {
          e['download_format'] = event;
        }
        return e;
      })
    }
  }

  remind(text, color, autoFade) {
    let snackbarColor = '';
    let snackbarFade = 0;
    if(color === 'red') {
      snackbarColor = 'snack-bar-setting-red';
    } else if (color === 'green') {
      snackbarColor = 'snack-bar-setting-green';
    } else if (color === 'brown') {
      snackbarColor = 'snack-bar-setting-brown';
    }
    if(autoFade) {
      snackbarFade = 2000; // 兩秒後自動消失
    } else {
      snackbarFade = 0; // 點選了解才消失
    }

    this.snackBar.open(text, '了解', {
      duration: snackbarFade,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: [snackbarColor]
    });
  }

  selectFormat(event, data) {
    this.listOfData = this.listOfData.map(e => {
      if(e['id'] === data.id) {
        e['download_format'] = event;
      }
      return e;
    })

    this.selectAllFileFormat = '';
  }
}
