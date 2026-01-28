import { Component, OnInit, EventEmitter, Output, OnDestroy } from '@angular/core';
import { CenterService } from '../../pages/center.service';
import { routes } from '../../routes';
import { ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() check: EventEmitter<boolean> = new EventEmitter();
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  public routes: typeof routes = routes;
  all_page_cfgs = [];
  sidebarOpen = false;
  uploadStatus = false;

  constructor(
    private centerService: CenterService,
  ) {
    // 取得cfg資料
    setTimeout(() => {
      // this.all_page_cfgs = this.centerService.get_all_page_cfg();

      const allConfigs = this.centerService.get_all_page_cfg();
      // 過濾只顯示「地圖查詢及下載」
      this.all_page_cfgs = allConfigs.map(page => ({
        ...page,
        child_page: page.child_page.filter(child =>
          child.name === '地圖查詢及下載'
        )
      })).filter(page => page.child_page && page.child_page.length > 0);
    }, 1000);

    // 接收正在上傳中的訊息(避免切頁)
    this.centerService.uploadStatus$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.uploadStatus = res['uploadStatus'];
      })
  }

  ngOnInit(): void {}

  // 點選漢堡選單
  menuToggle() {
    this.sidebarOpen = !this.sidebarOpen;

    // 傳訊息給layout(調整側邊欄寬度)
    this.check.emit(this.sidebarOpen);

    // 傳訊息給filter&或其他元件，偵測側邊欄開合調整元件/區塊寬度
    this.centerService.isSidebarOpen$.next({
      sidebarOpen: this.sidebarOpen
    })
  }

  // 是否顯現選項(目前不使用)
  isActive(router, is_link, lv): boolean {
    let res = false;
    let page_perm = localStorage.getItem('page_perm').split(',');
    let last_path = router.substring(router.lastIndexOf('/') + 1);
    if(lv == 1 && is_link && page_perm.includes(last_path)) {
      res = true;
    } else if(lv == 2 && !is_link && page_perm.includes(last_path)) {
      res = true;
    } else if(lv == 2 && ['setting', 'view'].includes(last_path)) {
      res = true;
    }
    return res;
  }

  setMargin() {
    if(this.sidebarOpen) {
      return 'other-set';
    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
