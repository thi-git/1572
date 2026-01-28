import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../pages/auth/services';
import { CenterService } from '../../pages/center.service';
import { Router, NavigationEnd } from '@angular/router';
import { routes } from '../../routes';
// rxjs調用
import { takeUntil, filter } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { sign } from 'crypto';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  public routers: typeof routes = routes;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  uploadStatus: boolean = false; // 是否為上傳中狀態
  user = '';

  // header分頁
  setting = {
    lv1_page: '', // 第一層分頁
    lv2_page: '', // 第二層分頁
  };

  constructor(
    private centerService: CenterService,
    private userService: AuthService,
    private router: Router,
  ) {
    // 取得第一層分頁data(監聽router事件)
    router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this.destroyed$)
      )
      .subscribe(() => {
        const pagesArr = this.router.url.split('/');
        const page_all = pagesArr[1] + '/' + pagesArr[2];
        const page_lv1 = page_all.split('/')[0];

        this.setting.lv1_page = this.pageName1(page_lv1);
        this.setting.lv2_page = this.pageName2(page_all);
      });

    // 接收正在上傳中的訊息(避免使用者點選登出)
    this.centerService.uploadStatus$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.uploadStatus = res['uploadStatus'];
      })
  }

  ngOnInit(): void {
    this.user = this.centerService.user_name;
  }

  // 第一層
  pageName1(pn) {
    switch (pn) {
      case 'view':
        return '資料檢視及下載';
      case 'setting':
        return '路口資料管理及維護';
      case 'back':
        return '後台資料管理';
      default:
        return '找不到此頁面';
    }
  }

  // 第二層
  pageName2(pn) {
    switch (pn) {
      case 'view/search':
        return '地圖查詢及下載';
      case 'view/analyze':
        return '資料分析檢視';
      case 'view/db_search':
        return '資料庫查詢';
      case 'view/quality':
        return '資料品質檢核';
      case 'setting/download':
        return '範例檔案下載';
      case 'setting/upload':
        return '調查檔案上傳';
      case 'setting/edit':
        return '路口新增與維護';
      case 'back/list_manage':
        return '清單內容管理';
      case 'back/permission':
        return '帳號權限管理';
      default:
        return '找不到此頁面';
    }
  }

  public signOut(): void {
    this.userService.signOut();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
