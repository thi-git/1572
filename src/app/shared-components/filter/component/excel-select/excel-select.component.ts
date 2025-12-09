import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';


@Component({
  selector: 'app-excel-select',
  templateUrl: './excel-select.component.html',
  styleUrls: ['./excel-select.component.scss'],
})
export class ExcelSelectComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild('fileUploader') fileUploader: ElementRef;
  isPreview: boolean = false; // 是否進入預覽模式
  excel;
  acceptFormat = '';

  constructor(
    private centerService: CenterService,
    private snackBar: MatSnackBar
  ) {
    // 上傳成功=>isPreview = false / 失敗=>isPreview = true(待調整)
    // this.centerService.uploadTest$
    //   .pipe(takeUntil(this.destroyed$))
    //   .subscribe((res) => {
    //     if(res['type'] === 'one_file') {
    //       this.isPreview = res['uploadStatus'];
    //       let fileInput: any = document.getElementById('file-uploader');
    //       fileInput.value = ''; // 清空input
    //       this.excel = undefined; // 清空excel資料
    //     }
    //   })

    // 允許的上傳格式(流量/延滯:xlsx; 其他:不限)
    this.centerService.dataType$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(res => {
        if(res === 'other') {
          this.acceptFormat = '';
        } else {
          this.acceptFormat = '.xlsx';
        }
      })
  }

  ngOnInit(): void {
  }

  // 取得excel資料
  getFile(files: FileList) {
    if(files) {
      this.excel = files;
      this.centerService.excelUpload$.next(this.excel);

      // 如果在預覽狀態下，使用者選擇新檔案時重新執行預覽
      if(this.isPreview) {
        this.preview();
      }
    }
  }

  // 預覽excel
  preview() {
    if(this.excel) {
      // this.isPreview = true; // 進入預覽模式
      this.centerService.excelPreview$.next(this.excel);
    } else {
      this.remind('請選擇檔案', 'red', false);
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
}
