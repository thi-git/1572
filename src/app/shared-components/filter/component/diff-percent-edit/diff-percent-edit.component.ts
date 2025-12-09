import { Component, OnInit, ViewChild } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';
import { MatExpansionPanel } from '@angular/material/expansion';


@Component({
  selector: 'app-diff-percent-edit',
  templateUrl: './diff-percent-edit.component.html',
  styleUrls: ['./diff-percent-edit.component.scss']
})
export class DiffPercentEditComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild('panel') panel: MatExpansionPanel;
  qualityStep = ''; // 檢核頁面測試
  diff = '';

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

  getValue(e) {
    this.centerService.sendResultReq$.next({
      req_diff: e['target']['value']
    })
  }
}



