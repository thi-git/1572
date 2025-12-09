import { Component, OnInit } from '@angular/core';
import { CenterService } from 'src/app/pages/center.service';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-upload-result',
  templateUrl: './upload-result.component.html',
  styleUrls: ['./upload-result.component.scss']
})
export class UploadResultComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  allUploadFile = [];

  constructor(
    private centerService: CenterService,
  ) {
    this.centerService.uploadTest$
    .pipe(takeUntil(this.destroyed$))
    .subscribe(res => {
      if(res['type'] === 'start') {
        // 整體初始設定
        this.allUploadFile = Array.from(res['allFiles']).map(e => {
          return {
            name: e['name'],
            status: '上傳中'
          }
        });
      } else if(res['type'] === 'one_file') {
        // 單一file上傳處理
        this.allUploadFile = this.allUploadFile.map(e => {
          if(e.name === res['now_file']) {
            e.status = res['msg'];
            e.color = res['msg'] === '上傳成功' ? 'success' : 'fail';
          }
          return e;
        })
      }
    })
  }

  close() {
    this.allUploadFile.length = 0;
  }

  ngOnInit(): void {
  }
}
