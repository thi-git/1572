import { Component, OnInit, NgZone } from '@angular/core';
import { CenterService } from '../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { environment } from '../../../environments/environment';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as moment from 'moment';

@Component({
  selector: 'app-data-list',
  templateUrl: './data-list.component.html',
  styleUrls: ['./data-list.component.scss']
})
export class DataListComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  user = '';
  isSelecting: boolean; // 有框選的動作(判斷右邊視窗開合)
  selectedTC: any = []; // 被點選/框選的TC
  allDataType = ['volume', 'delay']; // 所有資料類型
  downloadDataArr: any = []; // 紀錄要下載的資料id
  downloadDataArrSave: any = []; // 紀錄要下載的資料id(儲存功能)
  uploadDataRes = []; // 清洗後的詳細資料(列表用)
  uploadDataResNew = [];
  selectFormatMode = 0; // 預設下載檔
  today = moment().subtract(1, 'days').format('YYYY-MM-DD');
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
    private snackBar: MatSnackBar,
    private ngZone: NgZone
  ) {
    // 取得點選/框選的TC資料
    this.centerService.tcSelected$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.ngZone.run(() => {
          if(res) {
            this.isSelecting = res['isSelecting'];
            this.selectedTC = res['selectedTC'];
            this.uploadDataRes.length = 0;
            this.downloadDataArr.length = 0;
            this.downloadDataArrSave.length = 0;
            this.uploadDataResNew.length = 0;

            // 整理資料類型
            let dataTypeArr;
            this.selectedTC.forEach((e) => {
              if(e['uploadData'].length !== 0) {
                dataTypeArr = Object.keys(e['uploadData'][0]);

                // 用於之後勾選的設定(預設勾選)
                let temp = []
                Object.values(e['uploadData'][0]).forEach((k: any) => {
                  temp.push(...k);
                })

                temp = temp.map(a => {
                  a['is_enable'] = true;
                  return a;
                })
              } else {
                dataTypeArr = [];
              }

              let eachData = {
                road: e['road'],
                tc_id: e['tc_id'],
                dataType: dataTypeArr,
              }
              dataTypeArr.forEach((type) => {
                eachData[type] = e['uploadData'][0][type];
              })
              this.uploadDataRes.push(eachData);
            })

            let uploadDataResTest = this.uploadDataRes.slice();

            if(uploadDataResTest.length > 0) {
              this.uploadDataResNew = uploadDataResTest.map((e) => {
                // 如果有delay資料才會做以下轉換
                if(Object.keys(e).includes('delay')) {
                  let changeOne = {}
                  e['delay'].forEach((el) => {
                    changeOne[el['date_group']] = []
                  })

                  let changeRes = changeOne;
                  e['delay'].forEach((k) => {
                    Object.keys(changeOne).forEach((el) => {
                      if(k['date_group'] === el) {
                        // 不顯示重複日期
                        let dataArr = k['date_group'].split('_');
                        dataArr = dataArr.filter((item, i) => dataArr.indexOf(item) === i);
                        k['date_group'] = dataArr.join(', ');
                        changeOne[el].push(k);
                      }
                    })
                  })

                  // 只取第一筆資料
                  Object.keys(changeOne).map((e) => {
                    changeRes[e] = changeOne[e][0]
                  })

                  e['delay'] = Object.values(changeRes)
                  return e
                }
              })

              this.uploadDataResNew = this.uploadDataRes.map(e => {
                // 流量資料補上星期幾
                if(e['volume']) {
                  e['volume'].forEach((ele => {
                    let numRes = moment(ele['date']).weekday();
                    ele['week_type'] = this.week_type[numRes];
                  }))
                }
                return e;
              })
            }

            // 將所有上傳資料的id加入陣列
            this.uploadDataRes.forEach((e)=>{
              this.allDataType.forEach((el)=>{
                if(e[el]){
                  e[el].forEach((addId)=>{
                    this.downloadDataArr.push(addId['id'])
                  })
                }
              })
            })

            // 只顯示有上傳記錄的資料
            this.uploadDataRes = this.uploadDataRes.filter(e => e['dataType'].length > 0);
            this.downloadDataArrSave = this.downloadDataArr.slice();
          }
        })
      })
  }

  ngOnInit(): void {
    this.user = this.centerService.user_name;
    // console.log(this.user);

  }

  // 下載
  downloadData() {
    // 下載格式參數設定
    let data = [];
    this.downloadDataArr.forEach(e => {
      data.push({
        id: e,
        format: this.selectFormatMode
      })
    })

    let req_body = {
      data: data
    }

    if(this.downloadDataArr.length > 0) {
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
      this.remind('請選擇檔案' , 'red', true)
    }

  }

  // 選項勾選
  toggle(event, e){
    if(event.checked){
      this.downloadDataArr.push(e['id']);
    } else {
      this.downloadDataArr = this.downloadDataArr.filter((el)=>{
        return el !== e['id'];
      })
    }
  }

  // 全選清空設定
  toggleAll(option) {
    if(option) {
      // 全部勾選
      this.uploadDataRes.forEach((eachData) => {
        eachData['dataType'].forEach((type => {
          eachData[type] = eachData[type].map(a => {
            a['is_enable'] = true;
            return a;
          })
        }))
      });
      // 資料設定
      this.downloadDataArr = this.downloadDataArrSave.slice();
    } else {
      // 全部清空
      this.uploadDataRes.forEach((eachData) => {
        eachData['dataType'].forEach((type => {
          eachData[type] = eachData[type].map(a => {
            a['is_enable'] = false;
            return a;
          })
        }))
      });
      // 資料設定
      this.downloadDataArr.length = 0;
    }
  }

  // 設定下載格式(下載檔:0 上傳檔:1)
  selectFormat(option) {
    this.selectFormatMode = option;
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

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}


