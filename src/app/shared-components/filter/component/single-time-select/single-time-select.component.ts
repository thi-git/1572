import { Component, OnInit, ViewChild } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';
import { MatExpansionPanel } from '@angular/material/expansion';

@Component({
  selector: 'app-single-time-select',
  templateUrl: './single-time-select.component.html',
  styleUrls: ['./single-time-select.component.scss']
})
export class SingleTimeSelectComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild('panel') panel: MatExpansionPanel;
  panelOpen: boolean = false;
  qualityStep = ''; // 檢核頁面測試
  select: string = '選擇時段';
  types: string[] = [];

  start_time = '07:00';
  end_time = '09:00';
  a = '07:00';
  b = '09:00';

  urlTest = '';
  pageTest = '';

  constructor(
    private centerService: CenterService,
    private authService: AuthService,
    private router: Router,
  ) {
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.qualityStep = res['selectEditStep'];
      })
  }

  ngOnInit(): void {
    // 取得頁面資料
    this.urlTest = this.router.url
    this.pageTest = this.router.url.split('/')[2];

    this.types = [
      '05:45-06:00',
      '00:00-06:30',
      '06:45-11:30',
      '13:15-16:15',
      '17:30-20:15',
      '21:00-23:45',
      '00:00-23:45',
    ];

    // 如果點擊視窗，就會將filter收合
    this.centerService.windowClick$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((click) => {
        if(click) {
          this.panelOpen = false;
        }
      })
  }

  // 是否呈現filter
  setDisplay() {
    if (this.pageTest === 'quality') {
      if(this.qualityStep === 'result') {
        return 'display';
      } else {
        return 'none';
      }
    } else {
      return 'display';
    }
  }

  selectChange(type: string) {
    this.select = type;
    this.panelOpen = false;

    this.centerService.sendResultReq$.next({
      req_time: type.split('-')
    })
  }

  close() {
    // this.panel.close();
  }

  // 設定開始時間
  timePickerStartChange(e) {
    this.start_time = e;
    this.sendTime();
  }

  // 設定結束時間
  timePickerEndChange(e) {
    this.end_time = e;
    this.sendTime();
  }

  sendTime() {
    this.centerService.sendResultReq$.next({
      req_time: [this.start_time, this.end_time]
    })
  }
}
