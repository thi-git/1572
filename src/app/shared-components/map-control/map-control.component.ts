import { Component, OnDestroy, OnInit } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { CenterService } from "../../pages/center.service";
import { Router } from '@angular/router';
// angular 動畫
import {
  trigger,
  state,
  style,
  animate,
  transition,
  // ...
} from '@angular/animations';

@Component({
  selector: 'app-map-control',
  templateUrl: './map-control.component.html',
  styleUrls: ['./map-control.component.scss'],
  animations: [
    trigger('openClose150', [
      state('open', style({
        width: '150px',
        opacity: 1,
        'padding-left': '10px'
      })),
      state('closed', style({
        width: '0px',
        opacity: 0,
        'padding-left': '0px',
      })),
      transition('open => closed', [
        animate('0.3s')
      ]),
      transition('closed => open', [
        animate('0.3s')
      ]),
    ])
  ]
})
export class MapControlComponent implements OnInit, OnDestroy {
  public destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  showMapControl = false;
  user = '';
  page = '';
  mapCrontrol = {
    upload: true,
    setting: true,
    no_data: false
  }

  display_control = {
    upload: true,
    setting: true,
    no_data: true
  }

  mapCrontrol_explan = {
    upload: false,
    setting: false,
    no_data: false
  }

  constructor(
    private centerService: CenterService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.user = this.centerService.user_name;

    this.page = this.router.url;
    if (this.page === "/view/analyze" || this.page === "/view/quality") {
      this.showMapControl = true;
    }

    // 只要點選serch btn，就將圖層開關設定為開啟(顯示所有TC)
    this.centerService.clickSearch$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if (res['mainTC'].length > 0) {
          this.showMapControl = true;

          this.mapCrontrol = {
            upload: true,
            setting: true,
            no_data: false
          }
        }
      })
  }


  toggleOpen(e) {
    this.mapCrontrol_explan[e] = true
  }

  toggleClose(e) {
    this.mapCrontrol_explan[e] = false
  }

  // 圖層開關控制
  changeDisplayStatus(e) {
    if (e === 'upload_data') {
      this.mapCrontrol.upload = !this.mapCrontrol.upload; // 橘色
    } else if (e === 'setting_data') {
      this.mapCrontrol.setting = !this.mapCrontrol.setting; // 藍色
    } else if (e === 'no_data') {
      this.mapCrontrol.no_data = !this.mapCrontrol.no_data; // 灰色
    }

    this.centerService.mapControl$.next({
      uploadStatus: this.mapCrontrol.upload ? true : false, // 藍色
      settingStatus: this.mapCrontrol.setting ? true : false, // 橘色
      nodataStatus: this.mapCrontrol.no_data ? true : false, // 灰色
    })
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
