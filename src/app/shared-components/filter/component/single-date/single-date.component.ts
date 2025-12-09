import { Component, OnInit, ViewChild } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { MatExpansionPanel } from '@angular/material/expansion';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import * as moment from 'moment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-single-date',
  templateUrl: './single-date.component.html',
  styleUrls: ['./single-date.component.scss']
})
export class SingleDateComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild('panel') panel: MatExpansionPanel;
  panelOpen: boolean = false;
  selectTime: string = '';
  timeOption: any = [];
  timeOptionSave = [];
  originData = {};
  week_type = {
    0: '日',
    1: '一',
    2: '二',
    3: '三',
    4: '四',
    5: '五',
    6: '六',
  }

  qualityStep = '';
  page = '';

  urlTest = '';
  pageTest = '';

  constructor(
    private centerService: CenterService,
    private router: Router,
  ) {
    // 選擇TC後連動時間範圍filter
    this.centerService.mainRoad$.subscribe(res => {
      if(res['selectStatus']) {
        // this.timeOption.length = 0;
        this.timeOption = [];
        this.selectTime = '';
        let tempRes = {}
        Object.keys(this.originData).forEach(e => {
          if(res['tcId'].includes(e)) {
            tempRes[e] = this.originData[e];
          }
        })

        const arrays = Object.values(tempRes);
        this.timeOption = arrays.reduce((accumulator: any, currentValue: any) => {
          return accumulator.filter((value: any) => currentValue.includes(value));
        });

        let asd = [];
        this.timeOption = this.timeOption.map(e => {
          let numRes = moment(e).weekday();
          if(numRes === 0 || numRes === 6) {
            asd.push('假日');
          } else {
            asd.push('平日');
          }
          return `${e} (${this.week_type[numRes]})`;
        })

        // 傳訊息連動平假日
        if(asd.length > 0) {
          if(asd.every(e => e === '假日')) {
            this.centerService.selectSingleDate$.next({
              date_type: '假日'
            })
          } else if(asd.every(e => e === '平日')) {
            this.centerService.selectSingleDate$.next({
              date_type: '平日'
            })
          }
        } else {
          this.centerService.selectSingleDate$.next({
            date_type: '全部顯示'
          })
        }
      } else {
        // 沒有勾選路口(顯示全部時間)
        this.timeOption = this.timeOptionSave;
        this.centerService.selectSingleDate$.next({
          date_type: '全部顯示'
        })
      }
    })

    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.qualityStep = res['selectEditStep'];
      })
  }

  ngOnInit() {
    // 取得頁面資料
    this.urlTest = this.router.url
    this.pageTest = this.router.url.split('/')[2];

    this.page = this.router.url;

    // 預設傳送空字串
    this.centerService.singleDateTest$.next({
      singleDate: ''
    })

    // 取得有上傳過資料的日期
    this.centerService.get('/api/tc_road/tc_uploaded_date').subscribe((res) => {
      let temp = res['data'];

      this.originData = Object.keys(temp)
      .filter(key => key !== '')
      .reduce((obj, key) => {
        obj[key] = temp[key];
        return obj;
    }, {});

      Object.values(this.originData).forEach((e: any) => {
        this.timeOption.push(...e);
      })

      // 過濾掉重複內容
      this.timeOption = [...new Set(this.timeOption)];

      this.timeOption = this.timeOption.map(e => {
        let numRes = moment(e).weekday();
        return `${e} (${this.week_type[numRes]})`;
      })
      // this.timeOptionSave = this.timeOption.slice();
      this.timeOptionSave = Array.from(this.timeOption);
    })

    // 點選視窗關掉panel
    this.centerService.windowClick$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((click) => {
        if (click) {
          this.panelOpen = false;
        }
      })
  }

  selectChange(type: string) {
    this.selectTime = type;

    if(typeof this.selectTime !== 'undefined') {
      this.centerService.singleDateTest$.next({
        singleDate: this.selectTime.split(' ')[0]
      })
    }

    if(['(六)', '(日)'].includes(type.split(' ')[1])) {
      this.centerService.selectSingleDate$.next({
        date_type: '假日'
      })
    } else {
      this.centerService.selectSingleDate$.next({
        date_type: '平日'
      })
    }
  }

  close() {
    this.panel.close();
  }

  // 是否呈現filter
  test() {
    // if (this.router.url === '/view/quality') {
    //   if(this.qualityStep === 'basic') {
    //     if(!this.centerService.sidebarOpenTest) {
    //       return 'close2';
    //     } else {
    //       return 'open2';
    //     }
    //   } else {
    //     return 'none';
    //   }
    // } else {
    //   if(!this.centerService.sidebarOpenTest) {
    //     return 'close';
    //   } else {
    //     return 'open';
    //   }
    // }

    if (this.pageTest === 'quality') {
      if(this.qualityStep === 'basic') {
        return 'single-date ';
      } else {
        return 'none';
      }
    } else {
      return 'single-date ';
    }
  }
}
