import { Component, OnInit } from '@angular/core';
import { CenterService } from '../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-sample-download',
  templateUrl: './sample-download.component.html',
  styleUrls: ['./sample-download.component.scss'],
})
export class SampleDownloadComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  data_type: string = 'volume';
  intersection_type: string = 'other';
  sample_data: Object[] = [];
  filter: Object[] = [];
  BACKEND_SERVER = environment.serverIP + '/res/'; // 取得後端靜態資料路徑

  constructor(
    private centerService: CenterService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    document
      .getElementById('sample-download')
      .addEventListener('click', (e) => {
        this.centerService.windowClick$.next(true);
      });

    // data-type資料
    this.centerService.dataType$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((type: string) => {
        this.data_type = type;
        this.filterByData(this.data_type);
      });

    // 取得範例資料
    this.centerService.get('/api/sample/all').subscribe({
      next: (res) => {
        if (res.data.length > 0) {
          this.sample_data = res.data;
          this.filter = this.sample_data.filter(
            (item) => item['data_type'] == this.data_type
          );
        }
      },
      error: (err) => {
        console.log(err);
        if(err.error.msg === 'Token has expired') {
          this.authService.signOut(); // token過期登出
        }
      }
    });
  }

  // 資料類型篩選
  filterByData(type) {
    this.filter.length = 0;
    this.filter = this.sample_data.filter(
      (item) => item['data_type'] == type
    );

    // 延滯資料名稱較長，會拆為兩段顯示
    // this.filter = this.filter.map((e) => {
    //   if(e['data_type'] === 'delay') {
    //     let nameSplit = e['name'].split('(')
    //     e['name1'] = `${nameSplit[0]}`;
    //     e['name2'] = `(${nameSplit[1]}`;
    //   }
    //   return e;
    // })
  }

  // 路口類型篩選
  filterByIntersection(type) {
    this.filter.length = 0;
    this.filter = this.sample_data.filter(
      (item) => item['data_type'] == this.data_type
    );

    // 延滯資料名稱較長，會拆為兩段顯示
    // this.filter = this.filter.map((e) => {
    //   if(e['data_type'] === 'delay') {
    //     let nameSplit = e['name'].split('(')
    //     e['name1'] = `${nameSplit[0]}`;
    //     e['name2'] = `(${nameSplit[1]}`;
    //   }
    //   return e;
    // })
  }

  // 下載
  download(file) {
    window.open(this.BACKEND_SERVER + file, file);
  }
}
