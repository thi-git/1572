import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { CenterService } from 'src/app/pages/center.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionPanel } from '@angular/material/expansion';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

interface DataItem {
  order: string; // 順序
  index: number; // 序號
  tc_id: string; // 設備編號
  name: string; // 路口名稱
}

@Component({
  selector: 'app-quality-basic',
  templateUrl: './quality-basic.component.html',
  styleUrls: ['./quality-basic.component.scss']
})
export class QualityBasicComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild('panel') panel: MatExpansionPanel;
  @Input() loading: boolean = false;
  @Input() originData!: any[];
  listOfColumn = []; // 欄位設定
  listOfData = []; // 資料設定
  @Input() showPagination: boolean = false;
  @Input() pageSize: number = 1000; // 每頁可呈現的資料筆數
  @Input() scrollY: string = '210px';
  @Input() scrollX: string = '1200';
  tableSize = 'default';
  selectEditStep = '';
  selectDirection = '';
  selectCheck = '';
  selectRoad = '請選擇基準路口';
  roadArr = [];
  panelOpen: boolean = false;
  status = '';
  selectDate = '';

  constructor(
    private centerService: CenterService,
    private snackBar: MatSnackBar
  ) {
    // 編輯步驟選擇
    this.centerService.editSelect$
    .pipe(takeUntil(this.destroyed$))
    .subscribe(res => {
      this.selectEditStep = 'basic';
      this.status = res['status'];

      if(typeof res['selectTC'] !== 'undefined') {
        this.selectDate = res['selectDate'];
        this.listOfData.length = 0; // 清空資料
        let orderTC = res['selectTC'].sort((a, b) => Number(a[0].slice(2)) - Number(b[0].slice(2)));
        this.roadArr = orderTC.map(e => `${e[0]} ${e[1]}`);

        orderTC.forEach((e, i) => {
          let eachData = {
            order: '',
            index: i + 1,
            tc_id: e[0],
            road: e[1],
          }

          // 更新資料
          this.listOfData = [
            ...this.listOfData,
            eachData,
          ];
        })
      }
    })
  }

  ngOnInit(): void {
    this.listOfColumn = [
      {
        title: '順序',
        value: 'order',
        priority: 1,
      },
      {
        title: '序號',
        value: 'index',
        priority: 1,
      },
      {
        title: '設備編號',
        value: 'tc_id',
        priority: 1,
        width: '100px'
      },
      {
        title: '路口名稱',
        value: 'road',
        priority: 1,
        width: '180px'
      },
    ];
  }

  selectChange(type, select) {
    if(type === 'direction') {
      this.selectDirection = select; // 連鎖方向
    } else if(type === 'check') {
      this.selectCheck = select; // 檢核方式
    }
  }

  selectChangeRoad(road) {
    this.selectRoad = road.split(' ')[0]; // 基準路口

    // 選完後觸發底下表格排序事件
    let tcItem = this.listOfData.find(item => item.tc_id === this.selectRoad);
    if (tcItem) {
      // 移除
      this.listOfData = this.listOfData.filter(item => item.tc_id !== this.selectRoad);

      // 放第一項
      this.listOfData.unshift(tcItem);
    }
  }

  // 排序事件後表格資料更新
  drop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.listOfData, event.previousIndex, event.currentIndex);
  }

  // 下一步
  changePage() {
    let orderData = this.listOfData.map(e => e['tc_id']); // 使用者調整後的最終排序
    if(this.selectDirection === '') {
      this.remind('連鎖方向未設定', 'red', false);
    } else if(this.selectCheck === '') {
      this.remind('檢核方式未設定', 'red', false);
    } else if(this.selectRoad === '請選擇基準路口') {
      this.remind('基準路口未設定', 'red', false);
    } else {
      // 取得基本資料
      let req_body = {
        tc_id: orderData,
        direction: this.selectDirection,
        order: orderData // 給後端排序依據(看情況調整)
      }

      this.centerService.post('/api/quality/get_basic_data', req_body).subscribe({
        next: (res) => {
          if(res['code'] === 'fileContentError') {
            this.remind(res['message'], 'red', false);
          } else {
            // 傳送訊息顯示對應頁面元件
            this.selectEditStep = 'setting';
            this.centerService.editSelect$.next({
              selectEditStep: this.selectEditStep,
            })

            // 回傳資料做後續設定(看情況調整)
            this.centerService.sendBasicData$.next({
              basicData: res['data']['data'],
              direction: this.selectDirection, // 方向
              check: this.selectCheck, // 檢核方式
              order: orderData,
              all_date: res['data']['all_date'], // 共同日期
              selectDate: this.selectDate
            })
          }
        },
        error: (err) => {
          this.remind(err['message'] , 'red', false)

        }
      })
    }
  }

  close() {
    this.panel.close();
  }

  // snackbar提示設定
  remind(text, color, autoFade) {
    let snackbarColor = '';
    let snackbarFade = 0;
    if (color === 'red') {
      snackbarColor = 'snack-bar-setting-red';
    } else if (color === 'green') {
      snackbarColor = 'snack-bar-setting-green';
    } else if (color === 'brown') {
      snackbarColor = 'snack-bar-setting-brown';
    }
    if (autoFade) {
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
}
