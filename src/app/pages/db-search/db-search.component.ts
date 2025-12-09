import { Component, AfterViewInit, OnInit, ViewChild, Renderer2, ChangeDetectorRef } from '@angular/core';
import { CustomHostDirective } from '../../shared-components/custom-host.directive';
import { Router } from '@angular/router';
import { CenterService } from 'src/app/pages/center.service';
import { AuthService } from '../auth/services';

@Component({
  selector: 'app-db-search',
  templateUrl: './db-search.component.html',
  styleUrls: ['./db-search.component.scss']
})
export class DbSearchComponent implements OnInit, AfterViewInit {
  @ViewChild(CustomHostDirective) dynamicComponentLoader: CustomHostDirective;
  page_cfgs: void;
  Interval: NodeJS.Timeout;

  constructor(
    private router: Router,
    private renderer: Renderer2,
    private changeDetectorRef: ChangeDetectorRef,
    private centerService: CenterService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // 取得設定(第二層分頁)
    this.page_cfgs = this.centerService.get_lv2_cfg(this.router.url);

    this.Interval = setInterval(()=> {
      this.centerService.get('/api/tc/token_timeout_test').subscribe({
        next: (res) => {
          // console.log('資料庫查詢頁', res);
        },
        error: (err) => {
          console.log(err);
          this.authService.signOut(); // 登出
        }
      })
    }, 5 * 60 * 1000) // 每五分鐘偵測一次token是否過期
  }

  ngAfterViewInit(): void {
    const viewContainerRef = this.dynamicComponentLoader.viewContainerRef;
    // 清除元件
    viewContainerRef.clear();
    this.page_cfgs['components'].forEach((item, idx) => {
      // 動態產出模塊
      const componentRef = viewContainerRef.createComponent(
        this.dynamicComponentLoader.component_map[item.name]
      );
      // 新增item class
      this.renderer.addClass(componentRef.location.nativeElement, item.class);
      // 設定input
      // componentRef.instance['cfg'] = item.cfg;
      componentRef.instance['component_idx'] = idx;
    });
    // 重新同步動態生成子元件初始化數值
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy(): void {
    clearInterval(this.Interval)
  }
}
