import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { CenterService } from 'src/app/pages/center.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-edit-step',
  templateUrl: './edit-step.component.html',
  styleUrls: ['./edit-step.component.scss']
})
export class EditStepComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  selectEditStep: string = 'select'; // 選擇的編輯步驟
  previousEditStep: string = ''; // 前一個編輯步驟
  editStatus = {p1: false, p2: false, p3: false};
  openEdit: boolean = false;

  constructor(
    private centerService: CenterService,
    private snackBar: MatSnackBar
  ) {
    this.centerService.editStatus$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res['openEdit']) {
          this.openEdit = true;
          this.selectEditStep = 'definition';
          this.centerService.editSelect$.next({
            selectEditStep: this.selectEditStep,
            previousEditStep: this.previousEditStep
          })
        }
      })

    // 結束編輯
    this.centerService.backToStartFilter$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.previousEditStep = ''; // 回復最開始設定
        this.changePage('select');
        this.openEdit = false;

        this.editStatus['p1'] = false;
        this.editStatus['p2'] = false;
        this.editStatus['p3'] = false;
      })

    // 接收狀態
    this.centerService.test$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((res) => {
      if(res['first']) {
        this.editStatus = res['status']; // 初始設定
      } else {
        let asd = res['change']['page']
        this.editStatus[asd] = res['change']['status'];
      }
    })
  }

  ngOnInit(): void {
    this.centerService.tc_id = '';

    // 預設傳送訊息顯示對應頁面元件
    this.centerService.editSelect$.next({
      selectEditStep: this.selectEditStep,
      previousEditStep: this.previousEditStep
    })
  }

  // 選擇頁面
  changePage(page) {
    if(!this.centerService.isMoving) {
      // 切頁防呆(傳送到頁面元件判斷編輯狀態)
      this.centerService.isEditing$.next({
        step: page,
      })

      // 如果在編輯中就不讓使用者切頁
      if(!this.centerService.isEditing) {
        if(page === 'select') {
          this.centerService.backToStart$.next(true);
          this.openEdit = false;
          this.previousEditStep = this.selectEditStep;
          this.selectEditStep = page;
          this.editStatus['p1'] = false;
          this.editStatus['p2'] = false;
          this.editStatus['p3'] = false;
        } else {
          if(this.centerService.tc_id.length > 0) {
            this.previousEditStep = this.selectEditStep;
            this.selectEditStep = page;
          } else {
            this.remind('請點選要編輯的TC', 'red', false);
          }
        }

        // 傳送訊息顯示對應頁面元件
        this.centerService.editSelect$.next({
          selectEditStep: this.selectEditStep,
          previousEditStep: this.previousEditStep
        })
      }
    }
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

  // 儲存/取消/結束編輯(編輯頁面)
  saveResult(res) {
    if(res === 'save' || res === 'cancel') {
      this.centerService.saveResult$.next({
        editStep: this.selectEditStep,
        status: res,
      })
    } else if (res === 'back') {
      // 從edit-step執行回到路口選擇頁面流程
      this.centerService.backToStartFilter$.next(true);
    }
  }
}
