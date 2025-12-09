import { Component, OnInit, ViewChild } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { MatExpansionPanel } from '@angular/material/expansion';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-time-select',
  templateUrl: './time-select.component.html',
  styleUrls: ['./time-select.component.scss']
})
export class TimeSelectComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild('panel') panel: MatExpansionPanel;
  panelOpen: boolean = false;
  selectTime: string = '';
  timeOption = [];

  constructor(
    private centerService: CenterService
  ) {
    this.centerService.selectSingleDate$.subscribe(res => {
      if(res['date_type'] === '全部顯示') {
        this.timeOption = this.orgData.slice();
      } else {
        this.timeOption = this.orgData.filter(e => {
          if(e['weekday'] === res['date_type']) return e;
        })
        this.selectTime = '';
      }
    })
  }

  ngOnInit() {
    // 點選視窗關掉panel
    this.centerService.windowClick$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((click) => {
        if (click) {
          this.panelOpen = false;
        }
      })

      this.timeOption = this.orgData.slice();

    // 點擊視窗收合filter
    this.centerService.windowClick$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((click) => {
      if(click) {
        this.panelOpen = false;
      }
    })
  }

  selectChange(type: string) {
    this.selectTime = type['name'];
    this.centerService.timePeriod$.next({
      time_period: type['time'],
      weekday: type['weekday'],
      time_ch_arr: [type['name'].split(' ')[0]]
    })
  }

  close() {
    this.panel.close();
  }

  orgData = [
    {
      name: '平日全時段 (06-22)',
      weekday: '平日',
      time: ['06:00:00', '22:00:00']
    },
    {
      name: '平日晨峰 (06-10)',
      weekday: '平日',
      time: ['06:00:00', '10:00:00']
    },
    {
      name: '平日離峰 (10-16)',
      weekday: '平日',
      time: ['10:00:00', '16:00:00']
    },
    {
      name: '平日昏峰 (16-20)',
      weekday: '平日',
      time: ['16:00:00', '20:00:00']
    },
    {
      name: '假日全時段 (09-20)',
      weekday: '假日',
      time: ['09:00:00', '20:00:00']
    },
    {
      name: '假日晨峰 (09-13)',
      weekday: '假日',
      time: ['09:00:00', '13:00:00']
    },
    {
      name: '假日離峰 (13-16)',
      weekday: '假日',
      time: ['13:00:00', '16:00:00']
    },
    {
      name: '假日昏峰 (16-20)',
      weekday: '假日',
      time: ['16:00:00', '20:00:00']
    }
  ];
}
