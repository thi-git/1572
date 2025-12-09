import { Component, OnInit } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-district',
  templateUrl: './district.component.html',
  styleUrls: ['./district.component.scss']
})
export class DistrictComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  panelOpen: boolean = false;
  isData: boolean = false; // 判斷是否有資料
  treeList = []; // 選項設定
  treeListCopy = []; // 完整選項資料(連動時未選/全選套用)
  originData = [];
  selectData = []; // 連動時設定傳送的資料
  all_district = [];

  selectSubpage: string = '';
  openList: boolean = false;

  urlTest = '';
  pageTest = '';

  constructor(
    private centerService: CenterService,
    private authService: AuthService,
    private router: Router,
  ) {
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.selectSubpage = res['selectSubpage'];
      })
  }

  ngOnInit(): void {
    // 取得頁面資料
    this.urlTest = this.router.url
    this.pageTest = this.router.url.split('/')[2];

    // 取得所有行政區資料
    this.centerService.filterDistrict$
    .pipe(takeUntil(this.destroyed$))
    .subscribe(res => {
      this.treeList = [];
      this.all_district = res['district_res'].slice();
      res['district_res'].forEach((e) => {
        this.treeList.push({
          text: e,
          value: e,
          collapsed: false,
          children: []
        })
      })

      this.isData = this.treeList.length > 0 ? true : false;
      this.treeListCopy = this.treeList.slice(); // 儲存全部資料
    })


    // 點擊視窗收合filter
    this.centerService.windowClick$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((click) => {
        if(click) {
          this.panelOpen = false;
        }
    })
  }

  getName(e) {
    // 暫時保留(待調整)
    if(e.length === 0) {
      e = this.all_district;
    }

    // filter連動
    this.centerService.changeFilter$.next({
      type: 'district',
      selectedData: e
    })

    // 傳送資料給filter
    this.centerService.district$.next({
      district: e
    })
  }

  // 是否呈現filter
  setDisplay() {
    if (this.pageTest === 'list_manage') {
      // 只有[清單內容管理_路口清單]需顯示
      if (this.selectSubpage === 'road') {
        return 'district';
      } else {
        return 'district-none';
      }
    } else {
      return 'district';
    }
  }
}
