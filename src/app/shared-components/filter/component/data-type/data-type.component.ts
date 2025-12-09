import { Component, OnInit, ViewChild } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { MatExpansionPanel } from '@angular/material/expansion';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';


@Component({
  selector: 'app-data-type',
  templateUrl: './data-type.component.html',
  styleUrls: ['./data-type.component.scss'],
})
export class DataTypeComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild('panel') panel: MatExpansionPanel;
  panelOpen: boolean = false;
  select: string = '流量';
  types: string[] = [];
  page = '';

  constructor(
    private centerService: CenterService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.page = this.router.url;
    this.centerService.dataType$.next('volume');

    if(this.router.url === '/setting/upload') {
      this.types = ['流量', '延滯', '其他資料'];
    } else {
      this.types = ['流量', '延滯'];
    }

    // 點選視窗關掉panel
    this.centerService.windowClick$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((click) => {
      if (click) {
        this.panel.close();
      }
    });
  }

  selectChange(type: string) {
    let val;
    if (type === '流量') {
      val = 'volume';
    } else if(type === '延滯') {
      val = 'delay';
    } else {
      val = 'other';
    }
    this.centerService.dataType$.next(val);
  }

  close() {
    this.panel.close();
  }
}
