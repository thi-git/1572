import { Component, OnInit } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import * as moment from 'moment';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-time-date',
  templateUrl: './time-date.component.html',
  styleUrls: ['./time-date.component.scss']
})
export class TimeDateComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  panelOpen: boolean = false;
  dateStart = '';
  dateEnd = '';
  timeRange = ''; // 顯示使用者選的起始時間
  title = '';
  isOldDataMode = false;
  page = '';

  constructor(
    private centerService: CenterService,
    private router: Router,
  ) {
    this.page = this.router.url;
    if(this.page === '/view/search') {
      this.title = '時間範圍';
    } else if(this.page === '/view/db_search') {
      this.title = '調查時間';
    }
  }

  ngOnInit(): void {
    this.timeRange = (this.dateStart === '' || this.dateStart === 'Invalid date') || (this.dateEnd === '' || this.dateEnd === 'Invalid date') ? '' :`${this.dateStart} - ${this.dateEnd}`

    // 傳訊息給search btn
    this.centerService.timeDate$.next({
      timeDate: {date_start: '' , date_end: ''} // 不設定時間(撈取全部資料)
    })

    // 如果點擊視窗，就會將filter收合
    this.centerService.windowClick$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((click)=>{
        if(click){
          this.panelOpen = false;
        }
      })
  }

  chooseStartDate(e: any) {
    this.dateStart = moment(e.value).format('YYYY-MM-DD');
    this.timeDate();
  }

  chooseEndDate(e: any) {
    this.dateEnd = moment(e.value).format('YYYY-MM-DD');
    this.timeDate();
  }

  timeDate() {
    this.timeRange = (this.dateStart === '' || this.dateStart === 'Invalid date') || (this.dateEnd === '' || this.dateEnd === 'Invalid date') ? '' :`${this.dateStart} - ${this.dateEnd}`
    const timeDataObj = {date_start: this.dateStart, date_end: this.dateEnd};

    // 傳訊息給search btn
    this.centerService.timeDate$.next({
      timeDate: timeDataObj
    })
  }

  // 調查日期大於兩年以上
  selectDate(e) {
    this.isOldDataMode = e['checked'];
    if(this.isOldDataMode) {
      this.timeRange = `${moment().subtract(2, 'years').format('YYYY-MM-DD')}前`
      const timeDataObj = {
        date_start: '2000-01-01',
        date_end: moment().subtract(2, 'years').format('YYYY-MM-DD')
      };

      // 傳訊息給search btn
      this.centerService.timeDate$.next({
        timeDate: timeDataObj
      })
    } else {
      this.timeDate();
    }
  }

  inputDisplay() {
    if(this.isOldDataMode) {
      return 'none';
    }
  }
}
