import { Component, OnInit, ViewChild } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';
import { MatExpansionPanel } from '@angular/material/expansion';
import * as moment from 'moment';


@Component({
  selector: 'app-single-date-select',
  templateUrl: './single-date-select.component.html',
  styleUrls: ['./single-date-select.component.scss']
})
export class SingleDateSelectComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild('panel') panel: MatExpansionPanel;
  panelOpen: boolean = false;
  qualityStep = ''; // 檢核頁面測試
  select: string = '選擇日期';
  types: string[] = [];
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
    private router: Router,
  ) {
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.qualityStep = res['selectEditStep'];
      })

    this.centerService.sendBasicData$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.types = res['all_date'].map(e => {
          let date_res = e.split(' ')[0];
          let numRes = moment(date_res).weekday();
          return `${date_res} (${this.week_type[numRes]})`;
        });
      })

  }

  ngOnInit(): void {
    // 開發用
    // this.types = [
    //   '2022-01-06 (四)',
    //   '2022-01-08 (六)',
    //   '2024-06-13 (四)'
    // ];

    // 如果點擊視窗，就會將filter收合
    this.centerService.windowClick$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((click) => {
        if(click) {
          this.panelOpen = false;
        }
      })
  }

  // 設定位置和顯示與否
  setPosition() {
    if(this.router.url === '/view/quality') {
      if(this.qualityStep === 'result') {
        return 'display';
      } else {
        return 'none';
      }
    }
  }

  selectChange(type: string) {
    this.select = type;
    this.panelOpen = false;

    this.centerService.sendResultReq$.next({
      req_date: type.split(' ')[0]
    })
  }

  close() {
    // this.panel.close();
  }
}
