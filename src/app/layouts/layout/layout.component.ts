import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { NavigationEnd, Router } from '@angular/router';
// rxjs調用
import { filter, takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav: MatSidenav;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  public loginPage: boolean = true;
  public isShowSidebar: boolean = false; // 側邊欄開合(預設收合)

  constructor(
    private router: Router,
  ) {
    router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroyed$)
    ).subscribe(() => {
      let urlPart = this.router.url.split('/').pop();
      if(urlPart === 'login' || urlPart === '') {
        this.loginPage = true;
      } else {
        this.loginPage = false;
      }
    });
  }

  ngOnInit(): void {}

  // 側邊欄開合
  sidebarShow(show) {
    this.isShowSidebar = show;
  }

  public ngOnDestroy(): void {
    this.sidenav.close();
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
