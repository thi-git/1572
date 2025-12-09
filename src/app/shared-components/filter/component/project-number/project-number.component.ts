import { Component, OnInit } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-project-number',
  templateUrl: './project-number.component.html',
  styleUrls: ['./project-number.component.scss']
})
export class ProjectNumberComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  panelOpen: boolean = false;
  isData: boolean = false; // 判斷是否有資料
  treeList = []; // 選項設定
  selectSubpage: string = ''; // 清單頁面判斷
  qualityStep = ''; // 檢核頁面判斷
  page = ''; // 所屬頁面

  originData = {}; // 原始資料(連動時取用來重洗資料)
  treeListCopy = []; // 完整選項資料(連動時未選/全選套用)
  selectData = []; // 連動時設定傳送的資料

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

    // 取得專案編號靜態資料
    this.centerService.filterProject$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(res => {
        this.treeList = [];
        res['project_num_res'].forEach((e) => {
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
    // filter連動(清單頁面不用往後連動)
    if(this.page !== 'list_manage') {
      this.centerService.changeFilter$.next({
        type: 'project_num',
        selectedData: e
      })
    }

    // 傳送資料給filter
    this.centerService.projectNumber$.next({
      projectNumber: e,
    })
  }

  // 是否呈現filter
  setDisplay() {
    if (this.page === 'quality') {
      if(this.qualityStep === 'basic') {
        return 'project-number';
      } else {
        return 'none';
      }
    } else if(this.page === 'list_manage') {
      if(this.selectSubpage === 'owner') {
        return 'project-number';
      } else {
        return 'none';
      }
    } else {
      return 'project-number';
    }
  }
}
