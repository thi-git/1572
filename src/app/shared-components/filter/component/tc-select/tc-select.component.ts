import { Component, OnInit } from '@angular/core';
import { CenterService } from 'src/app/pages/center.service';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/pages/auth/services';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tc-select',
  templateUrl: './tc-select.component.html',
  styleUrls: ['./tc-select.component.scss']
})
export class TcSelectComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  panelOpen: boolean = false;
  isData1: boolean = false; // 判斷是否有資料(區域篩選)
  isData2: boolean = false; // 判斷是否有資料(群組篩選)
  tabIndex = 0; // 選單tab
  subTabIndex = 0; // 子選單tab
  all_tc_id: any = []; // tc_id
  all_tc_road: any = []; // tc_id和路名
  selectEditStep: string = ''; // 編輯頁面判斷
  selectSubpage: string = ''; // 清單頁面判斷
  qualityStep = ''; // 檢核頁面判斷
  haveTab = false; // 部分頁面無地圖框選功能
  page = ''; // 所屬頁面
  selectStatus; // 是否有選取tc(部分頁面需做必選的防呆)


  // 區域篩選
  treeList = [];
  treeListCopy = []; // 完整資料(未選/全選時套用)
  originData = []; // 儲存撈到的TC&路名資料

  // 道路群組
  groupList = [];
  groupListCopy = []; // 完整資料(未選/全選時套用)
  originGroupData = [];

  // 選項設定
  option = {
    name: '全選',
    completed: true,
    subOption: [],
  };

  constructor(
    private centerService: CenterService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {
    // 1. 從地圖回傳框選資料
    // 2. 將資料傳給filter(mainRoad$)
    this.centerService.sendMapSelectResult$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        let all_tc_road = this.all_tc_road.filter((el) => {
          if(res['mapSelectResult'].length === 0) {
            res['mapSelectResult'] = this.all_tc_id;
          }
          if(res['mapSelectResult'].includes(el[0])) return el;
        })

        // 傳送資料給search btn
        this.centerService.mainRoad$.next({
          tcId: res['mapSelectResult'],
          tcIdRoad: all_tc_road,
          selectStatus: true,
        })
      })

    // 取得當前頁面分頁(編輯/清單/檢核)
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(this.page === 'edit') {
          this.selectEditStep = res['selectEditStep'];
        } else if(this.page === 'list_manage') {
          this.selectSubpage = res['selectSubpage'];
        } else if(this.page === 'quality') {
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

    // 判斷是否有地圖框選tab
    let tabList = ['search', 'analyze', 'quality'];
    if (tabList.includes(this.page)) {
      this.haveTab = true;
    }

    // 取得路口名稱
    let api_type = '';
    if(this.page === 'list_manage') {
      api_type = '/api/tc_road/get_all_info';
    } else {
      api_type = '/api/tc_road/get_uploaded_info';
    }
    let req_body = {"user_name": this.centerService['user_name']};
    this.centerService.post(api_type, req_body).subscribe({
      next: (res) => {
        if(res['data'].length > 0) {
          this.originData = res['data'];
          this.cleanData(this.originData);
        }
      },
      error: (err) => {
        console.log(err);
        if(err.error.msg === 'Token has expired') {
          this.authService.signOut(); // token過期登出
        } else {
          this.remind('未取得TC靜態資料', 'red', false);
        }
      }
    })

    // 取得道路群組(待調整)
    this.centerService.get('/api/road_group/group_data').subscribe({
      next: (res) => {
        this.originGroupData = res['data'];
        this.cleanData2();
      },
      error: (err) => {
        console.log(err);
      }
    })

    // 部分頁面地圖預設顯示TC點位
    if(this.page === 'analyze' || this.page === 'quality') {
      this.centerService.get('/api/turning/status').subscribe({
        next: (res) => {
          if (res['data'].length > 0) {
            this.centerService.tcAllData$.next({
              tc_all_data: res['data'],
            });
          }
        },
        error: (err) => {
          if (err.error.msg === 'Token has expired') {
            this.authService.signOut(); // token過期登出
          }
        }
      });
    }

    // TC連動
    this.centerService.filterTC$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(res => {
        this.treeList = [];
        let filteredData = [];
        if(this.page !== 'list_manage') {
          filteredData = this.originData.filter(e => {
            let haveType = e['data_type'].some(item => res['data_type_res'].includes(item));
            let haveProject = e['project_num'].some(item => res['project_num_res'].includes(item));
            let haveCity = res['city_res'].includes(e['city']);
            if(haveType && haveProject && haveCity) return e;
          })
        } else {
          filteredData = this.originData.filter(e => {
            let haveCity = Object.keys(res['city_res']).length === 0 ? true : res['city_res'].includes(e['city']);
            let haveDistrict = res['district_res'].includes(e['district']);
            if(haveCity && haveDistrict) return e;
          })
        }
        this.cleanData(filteredData);
      })
  }

  // 將資料洗成需要的格式
  cleanData(test) {
    this.all_tc_id.length = 0;

    // 地圖顯示全部TC點位
    test.forEach(e => {
      this.all_tc_id.push(e['tc_id']);
      this.all_tc_road.push([e['tc_id'], e['road']]);
    })

    if(this.router.url === '/view/analyze') {
      test = test.filter(e => e['edit_status'] === true); // 分析頁面顯示有上傳紀錄&有編輯過的路口
    }

    // 依照行政區分層
    let group = test.reduce((groups, item) => {
      const val = `${item['city']}(${item['district']})`;
      if (val !== '') {
        groups[val] = groups[val] || [];
        groups[val].push(item);
      }
      return groups;
    }, {});

    Object.keys(group).forEach((district) => {
      let roads = [];
      group[district].forEach((e) => {
        roads.push({ text: `${e['tc_id']} ${e['road']}`, value: e['tc_id'] })
      });
      // 依據tc_id排序
      roads.sort((a, b) => parseInt(a.value.split('TC')[1]) - parseInt(b.value.split('TC')[1]));
      this.treeList.push({ text: district, value: district, collapsed: false, children: roads });
    });

    this.isData1 = this.treeList.length > 0 ? true : false;
    this.treeListCopy = this.treeList.slice(); // 儲存全部資料
  }

  // 將資料洗成需要的格式(待調整)
  cleanData2() {
    this.groupList = this.originGroupData.map((e) => {
      let test = [];
      e['children'].forEach(el => {
        test.push({ text: `${el['road']}`, value: el['tc_id'] })
      })
      return { text: e['group'], value: e['group'], collapsed: false, children: test }
    })
    this.groupListCopy = this.groupList.slice(); // 儲存全部資料
  }

  // 觸發第一層tab(0:路口篩選  1:地圖框選)
  tabChange(event) {
    this.tabIndex = event['index'] === 0 ? 0 : 1;

    // 傳送框選訊息給地圖
    if(this.tabIndex === 0) {
      this.centerService.isMapSelect$.next(false);
    } else {
      this.centerService.isMapSelect$.next(true);
    }
  }

  // 觸發第二層tab(0:區域篩選  1:群組篩選)
  subTabChange(event) {
    this.subTabIndex = event['index'] === 0 ? 0 : 1;
  }

  // 勾選結果
  getName(e) {
    if(e.length === 0) {
      this.selectStatus = false;
    } else {
      this.selectStatus = true;
    }
    let all_tc_road = this.all_tc_road.filter((el) => {
      if(e.length === 0) {
        e = this.all_tc_id;
      }
      if(e.includes(el[0])) return el;
    })

    // 傳送資料給search btn
    this.centerService.mainRoad$.next({
      tcId: e,
      tcIdRoad: all_tc_road,
      selectStatus: this.selectStatus
    })
  }

  // panel打開時，如果是地圖框選模式，就傳送訊息給main-map以顯示右側框選按鈕()
  openPanel() {
    if(this.tabIndex === 1) {}
  }

  // 是否呈現filter
  setDisplay() {
    if (this.page === 'quality') {
      if(this.qualityStep === 'basic') {
        return 'tc-select';
      } else {
        return 'none';
      }
    } else if (this.page === 'edit') {
      if(this.selectEditStep === 'select') {
        return 'tc-select';
      } else {
        return 'none';
      }
    } else if (this.page === 'list_manage') {
      if (this.selectSubpage === 'road') {
        return 'tc-select';
      } else {
        return 'none';
      }
    } else {
      return 'tc-select';
    }
  }

  remind(text, color, autoFade) {
    let snackbarColor = '';
    let snackbarFade = 0;
    if(color === 'red') {
      snackbarColor = 'snack-bar-setting-red';
    } else if (color === 'green') {
      snackbarColor = 'snack-bar-setting-green';
    } else if (color === 'brown') {
      snackbarColor = 'snack-bar-setting-brown';
    }
    if(autoFade) {
      snackbarFade = 2000; // 兩秒後自動消失
    } else {
      snackbarFade = 0; // 點選了解才消失
    }

    this.snackBar.open(text, '了解', {
      duration: snackbarFade,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: [snackbarColor]
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
