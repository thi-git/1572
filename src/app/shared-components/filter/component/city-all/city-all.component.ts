import { Component, OnInit } from '@angular/core';
import { CenterService } from '../../../../pages/center.service';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-city-all',
  templateUrl: './city-all.component.html',
  styleUrls: ['./city-all.component.scss']
})
export class CityAllComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  panelOpen: boolean = false;
  selectSubpage: string = '';
  page: string = '';
  isData: boolean = false;
  treeList = [];

  constructor(
    private centerService: CenterService,
    private router: Router,
  ) {
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.selectSubpage = res['selectSubpage'];
      })
  }

  ngOnInit(): void {
    // 取得頁面
    this.page = this.router.url.split('/')[2];

    // 點擊視窗收合filter
    this.centerService.windowClick$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((click) => {
        if(click) {
          this.panelOpen = false;
        }
    })

    // 取得業主名稱靜態資料
    this.centerService.filterAllCity$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(res => {
        this.treeList = [];
        this.cleanData(res['city_res']);
    })
  }

  // 將資料洗成需要的格式
  cleanData(test) {
    // 依照行政區分層
    let group = test.reduce((groups, item) => {
      const val = item['area'];
      if (val !== '') {
        groups[val] = groups[val] || [];
        groups[val].push(item);
      }
      return groups;
    }, {});

    Object.keys(group).forEach((district, i) => {
      let roads = [];
      group[district].forEach((e) => {
        roads.push({ text: e['city'], value: e['city'] })
      });
      // 依據tc_id排序
      this.treeList.push({ text: district, value: district, collapsed: i === 0 ? false : true, children: roads });
    });

    this.isData = this.treeList.length > 0 ? true : false;
  }

  getName(e) {
    // filter連動
    this.centerService.changeFilter$.next({
      type: 'city_all',
      selectedData: e
    })

    // 傳送資料給search btn
    this.centerService.city$.next({
      city: e
    })
  }

  // 是否呈現filter(只有路口清單頁面需顯示)
  setDisplay() {
    if (this.page === 'list_manage') {
      if (this.selectSubpage === 'road') {
        return 'city-all';
      } else {
        return 'city-none';
      }
    }
  }
}
