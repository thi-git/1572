import { Component, OnInit } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject, Subscription } from 'rxjs';

@Component({
  selector: 'app-holiday-select',
  templateUrl: './holiday-select.component.html',
  styleUrls: ['./holiday-select.component.scss']
})
export class HolidaySelectComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  panelOpen: boolean = false;

  // 選項設定
  treeList = [
    {
      text: '平日',
      value: '平日',
      collapsed: false,
      children: []
    },
    {
      text: '一般假日',
      value: '一般假日',
      collapsed: false,
      children: []
    },
    {
      text: '連續假日',
      value: '連續假日',
      collapsed: false,
      children: []
    },
  ];

  constructor(
    private centerService: CenterService
  ) {}

  getName(e){
    // 傳送資料給search btn
    this.centerService.holidayType$.next({
      // dataTypeMultiple: e.length === 0 ? ['volume', 'volume_AI', 'delay'] : e
      holidayType: e
    })
  }

  ngOnInit(): void {
    // 如果點擊視窗，就會將filter收合
    this.centerService.windowClick$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((click)=>{
        if(click){
          this.panelOpen = false;
        }
      })
  }

}
