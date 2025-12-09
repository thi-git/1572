import { Component, OnInit } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-city-upload',
  templateUrl: './city-upload.component.html',
  styleUrls: ['./city-upload.component.scss']
})
export class CityUploadComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  panelOpen: boolean = false;
  isData: boolean = false; // 判斷是否有資料
  treeList = []; // 選項設定
  selectEditStep: string = ''; // 編輯頁面判斷
  qualityStep = ''; // 檢核頁面判斷
  page = ''; // 所屬頁面

  originData = {}; // 原始資料(連動時取用來重洗資料)
  treeListCopy = []; // 完整選項資料(連動時未選/全選套用)
  selectData = []; // 連動時設定傳送的資料
  all_district_new: any = [];
  projectNumList = [];

  constructor(
    private centerService: CenterService,
    private authService: AuthService,
    private router: Router,
  ) {
    // 取得當前頁面分頁(檢核/清單)
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(this.router.url === '/setting/edit') {
          this.selectEditStep = res['selectEditStep'];
        } else if(this.router.url === '/view/quality') {
          this.qualityStep = res['selectEditStep'];
        }
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

  ngOnInit(): void {
    // 所屬頁面
    this.page = this.router.url.split('/')[2];

    // 取得縣市靜態資料
    this.centerService.filterCity$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(res => {
        this.treeList = [];
        res['city_res'].forEach((e) => {
          this.treeList.push({
            text: e,
            value: e,
            collapsed: false,
            children: []
          });
        })
        this.isData = this.treeList.length > 0 ? true : false;
      })
  }

  getName(e) {
    // filter連動
    this.centerService.changeFilter$.next({
      type: 'city_upload',
      selectedData: e
    })

    // 暫時保留(待調整)
    if(e.length === 0) {
      e = this.all_district_new;
    }

    // 傳送資料給filter
    this.centerService.districtNew$.next({
      districtNew: e
    })
  }

  // 是否呈現filter
  setDisplay() {
    if (this.page === 'quality') {
      if(this.qualityStep === 'basic') {
        return 'district-new';
      } else {
        return 'none';
      }
    } else if (this.page === 'edit') {
      if(this.selectEditStep === 'select') {
        return 'district-new';
      } else {
        return 'none';
      }
    } else {
      return 'district-new';
    }
  }
}
