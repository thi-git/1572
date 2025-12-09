import { Component, OnInit } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-owner-name',
  templateUrl: './owner-name.component.html',
  styleUrls: ['./owner-name.component.scss']
})
export class OwnerNameComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  panelOpen: boolean = false;
  isData: boolean = false; // 判斷是否有資料
  treeList = []; // 選項設定
  selectSubpage: string = ''; // 清單頁面判斷
  qualityStep = ''; // 檢核頁面判斷
  page = ''; // 所屬頁面

  constructor(
    private centerService: CenterService,
    private authService: AuthService,
    private router: Router,
  ) {
    // 取得當前頁面分頁(檢核/清單)
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.selectSubpage = res['selectSubpage'];
        this.qualityStep = res['selectEditStep'];
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

    // 取得業主名稱靜態資料
    this.centerService.filterOwner$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(res => {
        this.treeList = [];
        res['owner_name_res'].forEach((e) => {
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
      type: 'owner_name',
      selectedData: e
    })

    // 傳送資料給filter
    this.centerService.ownerName$.next({
      ownerName: e
    })
  }

  // 是否呈現filter
  setDisplay() {
    if (this.page === 'quality') {
      if(this.qualityStep === 'basic') {
        return 'owner-name';
      } else {
        return 'none';
      }
    } else if(this.page === 'list_manage') {
      if(this.selectSubpage === 'owner') {
        return 'owner-name';
      } else {
        return 'none';
      }
    } else {
      return 'owner-name';
    }
  }
}
