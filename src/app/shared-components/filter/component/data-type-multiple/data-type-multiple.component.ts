import { Component, OnInit } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-data-type-multiple',
  templateUrl: './data-type-multiple.component.html',
  styleUrls: ['./data-type-multiple.component.scss']
})
export class DataTypeMultipleComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  panelOpen: boolean = false;
  user = '';
  // 選項設定
  treeList = [];

  constructor(
    private centerService: CenterService,
    private router: Router,
  ) {}

  getName(e) {
    // filter連動
    this.centerService.changeFilter$.next({
      type: 'data_type',
      selectedData: e
    })

    // 傳送資料給search btn
    this.centerService.dataTypeMultiple$.next({
      dataTypeMultiple: e.length === 0 ? ['volume', 'delay', 'other'] : e
    })
  }

  ngOnInit(): void {
    this.user = this.centerService.user_name;

    if (this.user == 'cy_gov') {
      this.treeList = [
        {
          text: '流量',
          value: 'volume',
          collapsed: false,
          children: []
        }
      ];
    } else {
      if(this.router.url === '/view/search') {
        this.treeList = [
          {
            text: '流量',
            value: 'volume',
            collapsed: false,
            children: []
          },
          {
            text: '延滯',
            value: 'delay',
            collapsed: false,
            children: []
          }
        ];
      } else {
        this.treeList = [
          {
            text: '流量',
            value: 'volume',
            collapsed: false,
            children: []
          },
          {
            text: '延滯',
            value: 'delay',
            collapsed: false,
            children: []
          },
          {
            text: '其他資料',
            value: 'other',
            collapsed: false,
            children: []
          }
        ];
      }
    }



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
