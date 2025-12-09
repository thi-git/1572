import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { CenterService } from 'src/app/pages/center.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-quality-step',
  templateUrl: './quality-step.component.html',
  styleUrls: ['./quality-step.component.scss']
})
export class QualityStepComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  selectEditStep: string = 'basic'; // 預設頁面

  constructor(
    private centerService: CenterService,
    private snackBar: MatSnackBar
  ) {
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.selectEditStep = res['selectEditStep'];
      })
  }

  ngOnInit(): void {
    this.centerService.tc_id = '';

    // 預設傳送訊息顯示對應頁面元件
    this.centerService.editSelect$.next({
      selectEditStep: this.selectEditStep,
    })
  }

  // 選擇頁面
  changePage(page) {
    this.selectEditStep = page;

    // 傳送訊息顯示對應頁面元件
    this.centerService.editSelect$.next({
      selectEditStep: this.selectEditStep,
      status: this.selectEditStep === 'basic' ? 'origin' : ''
    })
  }

  // snackbar提示設定
  remind(text, color, autoFade) {
    let snackbarColor = '';
    let snackbarFade = 0;
    if(color === 'red') {
      snackbarColor = 'snack-bar-setting-red';
    } else if (color === 'green') {
      snackbarColor = 'snack-bar-setting-green';
    } else if (color === 'brown') {
      snackbarColor = 'snack-bar-setting-brown';
    }
    if(autoFade) {
      snackbarFade = 2000; // 兩秒後自動消失
    } else {
      snackbarFade = 0; // 點選了解才消失
    }

    this.snackBar.open(text, '了解', {
      duration: snackbarFade,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: [snackbarColor]
    });
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
