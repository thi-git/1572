import { Component, OnInit, ViewChild } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { MatExpansionPanel } from '@angular/material/expansion';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';


@Component({
  selector: 'app-intersection-type',
  templateUrl: './intersection-type.component.html',
  styleUrls: ['./intersection-type.component.scss'],
})
export class IntersectionTypeComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild('panel') panel: MatExpansionPanel;
  panelOpen: boolean = false;
  select: string = '其他';
  types: string[] = ['三叉', '四叉', '五叉', '其他'];

  constructor(
    private centerService: CenterService
  ) {}

  ngOnInit(): void {
    this.centerService.intersectionType$.next('other');

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
    switch (type) {
      case '三叉':
        val = 'three';
        break;
      case '四叉':
        val = 'four';
        break;
      case '五叉':
        val = 'five';
        break;
      case '其他':
        val = 'other';
        break;
    }
    this.centerService.intersectionType$.next(val);
  }

  close() {
    this.panel.close();
  }
}
