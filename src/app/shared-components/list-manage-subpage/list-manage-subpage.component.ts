import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { CenterService } from 'src/app/pages/center.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-list-manage-subpage',
  templateUrl: './list-manage-subpage.component.html',
  styleUrls: ['./list-manage-subpage.component.scss']
})

export class ListManageSubpageComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  selectSubpage: string = '';  // 選擇的子頁，預設為業主專案子頁
  previousSubpage: string = ''; // 前一個編輯步驟
  listEditingStatus: boolean = false;

  constructor(
    private centerService: CenterService,
    private snackBar: MatSnackBar
  ) {
    // 顯示初始子頁元件
    this.centerService.editStatus$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res['openList']) {
          this.selectSubpage = 'owner';
        }
      });

    // 恢復原始設定
    this.centerService.backToStartFilter$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((_res) => {
        this.previousSubpage = '';
        this.changePage('owner');
      });
  }

  ngOnInit(): void {
    this.selectSubpage = 'owner';
    // 顯示對應頁面元件
    this.centerService.editSelect$.next({
      selectSubpage: this.selectSubpage,
      previousSubpage: this.previousSubpage
    })
  }

    // 選擇頁面
  changePage(page: string) {
    // 如果在編輯中就不讓使用者切頁
    if(!this.centerService.isListEditing) {
      if(page === 'owner') {
        this.centerService.backToStart$.next(true);
        this.previousSubpage = this.selectSubpage;
        this.selectSubpage = page;
      }
      else if(page === 'road') {
        this.centerService.backToStart$.next(true);
        this.previousSubpage = this.selectSubpage;
        this.selectSubpage = page;
      }

      // 顯示對應頁面元件
      this.centerService.editSelect$.next({
        selectSubpage: this.selectSubpage,
        previousSubpage: this.previousSubpage
      })
    } else {
      this.remind('請點選「儲存」，以保留資料變更。', 'red', false);
    }
  }

  // snackbar提示設定
  remind(text: string, color: string, autoFade: boolean) {
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
