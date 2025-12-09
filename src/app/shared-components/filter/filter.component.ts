import { Component, AfterViewInit, OnInit, OnDestroy, ViewChild, Renderer2, ChangeDetectorRef } from '@angular/core';
import { CustomHostDirective } from '../../shared-components/custom-host.directive';
import { CenterService } from 'src/app/pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
})
export class FilterComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild(CustomHostDirective) dynamicComponentLoader: CustomHostDirective;

  filter_cfgs: void;
  excel_upload;
  data_type: string;
  data_type_multiple: string[];
  owner_name: string[];
  project_number: string[];
  holiday_type: string[];
  district_new: string[];
  main_tc: string[];
  main_tc_road: string[][];
  single_date: string;
  weekday: string;
  time_period;
  time_ch_arr;
  time_date;
  city: string;
  district: string;
  all_tc_data; // 儲存撈到的TC資料(使用者篩選)
  all_uploaded_data; // 儲存撈到的上傳紀錄資料(使用者篩選)
  intersection_type: string;
  upload_status: boolean = false; // 是否為上傳中狀態
  selectEditStep: string = '';
  openEdit: boolean = false;
  selectSubpage: string = 'owner';
  openList: boolean = false;
  uploadCommit = '';
  step = 'basic'; // 檢核頁面測試
  insertedOwnerList: any[] = [];     // 儲存要新增的資料(業主名稱)
  updatedOwnerList: any[] = [];      // 儲存要更新的資料(業主名稱)
  deletedOwnerList: any[] = [];      // 儲存要刪除的資料(業主名稱)
  insertedRoadList: any[] = [];      // 儲存要新增的資料(路口清單)
  updatedRoadList: any[] = [];       // 儲存要更新的資料(路口清單)
  deletedRoadList: any[] = [];       // 儲存要刪除的資料(路口清單)
  insertStatus: boolean = false;
  deleteStatus: boolean = false;
  updateStatus: boolean = false;
  tcSelectStatus: boolean = false;
  page: string = '';

  // 原始資料
  orgData = {};
  data_type_res = ['volume', 'delay'];
  owner_name_res = {};
  project_num_res = {};
  city_res = [];
  owner_name_res_list = {};
  district_res_list = {};

  // 暫存資料
  project_num_temp = {};
  city_temp = [];

  constructor(
    private router: Router,
    private renderer: Renderer2,
    private changeDetectorRef: ChangeDetectorRef,
    private centerSVC: CenterService,
    private authService: AuthService,
  ) {
      this.centerSVC.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(this.router.url === '/setting/edit') {
          this.selectEditStep = res['selectEditStep'];
        } else if(this.router.url === '/back/list_manage') {
          this.selectSubpage = res['selectSubpage'];
          this.list_search();     // 初始就顯示資料
        } else if(this.router.url === '/view/quality') {
          this.step = res['selectEditStep'];
        }
      })

      this.centerSVC.editStatus$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(this.router.url === '/setting/edit') {
          this.openEdit = res['openEdit'];
        } else if(this.router.url === '/back/list_manage') {
          this.openEdit = res['openList'];
        }
      })

      this.centerSVC.backToStart$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.openEdit = false;
        this.openList = false;
      })
  }

  ngOnInit(): void {
    // 取得設定
    this.page = this.router.url.split('/')[2];
    this.filter_cfgs = this.centerSVC.get_lv2_filter_cfg(this.router.url);

    // excel資料
    this.centerSVC.excelUpload$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((excel) => {
        this.excel_upload = excel;
      });

    // 資料類型(單選)
    this.centerSVC.dataType$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((type: string) => {
        this.data_type = type;
      });

    // 資料類型(多選)
    this.centerSVC.dataTypeMultiple$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.data_type_multiple = res['dataTypeMultiple'];
      });

    // 業主名稱
    this.centerSVC.ownerName$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.owner_name = res['ownerName'];
      })

    // 專案編號
    this.centerSVC.projectNumber$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.project_number = res['projectNumber'];
      })

    // 平假日類型
    this.centerSVC.holidayType$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.holiday_type = res['holidayType'];
      })

    // 縣市(待調整)
    this.centerSVC.districtNew$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        // 待調整
        this.district_new = res['districtNew'].length === 0 ? this.city_res : res['districtNew'];
      })

    // 行政區
    this.centerSVC.district$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.district = res['district'];
      })

    // 所有TC資料
    this.centerSVC.mainRoad$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.main_tc = res['tcId'];
        this.main_tc_road = res['tcIdRoad'];
        this.tcSelectStatus = res['selectStatus'];
      });

    // 時間範圍
    this.centerSVC.timeDate$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.time_date = res['timeDate'];
      });

    // 單一日期
    this.centerSVC.singleDateTest$.pipe(takeUntil(this.destroyed$))
    .subscribe((res) => {
      this.single_date = res['singleDate'] === '' ? '' : res['singleDate'].split(' (')[0];
    })

    // 時段選擇
    this.centerSVC.timePeriod$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.weekday = res['weekday'];
        this.time_period = res['time_period'];
        this.time_ch_arr = res['time_ch_arr'];
      });

    // 地區
    this.centerSVC.city$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.city = res['city'];
      });

    // 行政區
    this.centerSVC.district$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.district = res['district'];
      });

    // 新增的資料(業主)
    this.centerSVC.insertedOwnerList$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.insertedOwnerList = res['insertedOwnerList'];
      });

    // 更新的資料(業主)
    this.centerSVC.updatedOwnerList$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.updatedOwnerList = res['updatedOwnerList'];
      });

    // 刪除的資料(業主)
    this.centerSVC.deletedOwnerList$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.deletedOwnerList = res['deletedOwnerList'];
      });

    // 新增的資料(路口)
    this.centerSVC.insertedRoadList$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.insertedRoadList = res['insertedRoadList'];
      });

    // 更新的資料(路口)
    this.centerSVC.updatedRoadList$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.updatedRoadList = res['updatedRoadList'];
      });

    // 刪除的資料(路口)
    this.centerSVC.deletedRoadList$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.deletedRoadList = res['deletedRoadList'];
      });

    // 取得filter資料
    if(this.page !== 'list_manage') {
      // 非清單頁面(同一支API取得所有資料(有上傳紀錄))
      let req_body = {"user_name": this.centerSVC['user_name']};
      this.centerSVC.post('/api/tc_road/get_uploaded_filter_data', req_body)
        .subscribe((res) => {
          this.orgData = res['data'];
          this.getAllFilterData(this.orgData, 'default'); // 預設內容
      })
    } else {
      // 清單頁面
      // 取得所有業主名稱&專案編號
      let req_body = {"user_name": this.centerSVC['user_name']};
      this.centerSVC.post('/api/owner_project/get_all_project', req_body).subscribe({
        next: (res) => {
          let owner_name_res = res['data'];
          let project_num_res = [];

          // 專案編號
          Object.values(owner_name_res).forEach((e: any) => {
            e.forEach(el => {
              if(!project_num_res.hasOwnProperty(el)) {
                project_num_res.push(el);
              }
            })
          })

          // 傳送訊息
          this.centerSVC.filterOwner$.next({
            owner_name_res: Object.keys(owner_name_res).sort()
          })
          this.centerSVC.filterProject$.next({
            project_num_res: project_num_res.sort()
          })

          // 儲存初始內容(之後連動時進行資料過濾)
          this.owner_name_res_list = owner_name_res;
        },
        error: (err) => {
          console.log(err);
          if(err.error.msg === 'Token has expired') {
            this.authService.signOut(); // token過期登出
          }
        }
      })

      // 取得所縣市資料
      this.centerSVC.post('/api/tc_road/get_all_city', req_body).subscribe({
        next: (res) => {
          // 傳送訊息
          this.centerSVC.filterAllCity$.next({
            city_res: res['data']
          })
        },
        error: (err) => {
          console.log(err);
          if(err.error.msg === 'Token has expired') {
            this.authService.signOut(); // token過期登出
          }
        }
      })

      // 取得所有行政區資料
      this.centerSVC.post('/api/tc_road/get_all_district', req_body).subscribe({
        next: (res) => {
          let district_res = [];

          // 行政區
          Object.values(res['data']).forEach((e: any) => {
            e.forEach(el => {
              if(!district_res.hasOwnProperty(el)) {
                district_res.push(el);
              }
            })
          })

          // 傳送訊息
          this.centerSVC.filterDistrict$.next({
            district_res: district_res
          })

          // 儲存初始內容(之後連動時進行資料過濾)
          this.district_res_list = res['data'];
        },
        error: (err) => {
          console.log(err);
          if(err.error.msg === 'Token has expired') {
            this.authService.signOut(); // token過期登出
          }
        }
      })
    }

    // [測試中]選項變動
    this.centerSVC.changeFilter$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((res) => {
      switch(res['type']) {
        // 變更資料類型
        case 'data_type':
          if(res['selectedData'].length > 0) {
            // 設定資料類型
            this.data_type_res = res['selectedData'].length === 0 ? ['volume', 'delay'] : res['selectedData'];
            // 過濾資料
            let temp = Object.keys(this.orgData)
              .filter(key => res['selectedData'].includes(key))
              .reduce((obj, key) => {
                obj[key] = this.orgData[key];
                return obj;
              }, {});
            this.getAllFilterData(temp, 'data_type_change');
          }
          break;
        // 變更業主名稱
        case 'owner_name':
          if(res['selectedData'].length > 0) {
            if(this.page !== 'list_manage') {
              // 過濾資料(一般頁面)
              let temp = Object.keys(this.owner_name_res)
                .filter(key => res['selectedData'].includes(key))
                .reduce((obj, key) => {
                  obj[key] = this.owner_name_res[key];
                    return obj;
              }, {});
              this.changeOwnerFilter(temp);
            } else {
              // 過濾資料(清單頁面)
              let temp = Object.keys(this.owner_name_res_list)
                .filter(key => res['selectedData'].includes(key))
                .reduce((obj, key) => {
                  obj[key] = this.owner_name_res_list[key];
                    return obj;
              }, {});
              this.changeListOwnerFilter(temp);
            }
          }
          break;
        // 變更專案編號
        case 'project_num':
          if(res['selectedData'].length > 0) {
            // 過濾資料
            let temp = Object.keys(this.project_num_res)
              .filter(key => res['selectedData'].includes(key))
              .reduce((obj, key) => {
                obj[key] = this.project_num_res[key];
                return obj;
              }, {});
            this.changeProjectFilter(temp);
          }
          break;
        // 變更縣市(有上傳紀錄，非清單頁面使用)
        case 'city_upload':
          if(res['selectedData'].length > 0) {
            this.changeCityUploadFilter(res['selectedData']);
          }
          break;
        // 變更縣市(所有內容，清單頁面使用)
        case 'city_all':
          if(res['selectedData'].length > 0) {
            // 過濾資料
            let temp = Object.keys(this.district_res_list)
              .filter(key => res['selectedData'].includes(key))
              .reduce((obj, key) => {
                obj[key] = this.district_res_list[key];
                return obj;
              }, {});
            this.changeCityAllFilter(temp);
          }
          break;
        // 行政區
        case 'district':
          if(res['selectedData'].length > 0) {
            // 過濾資料
            this.changeDistrictFilter(res['selectedData']);
          }
      }
    });
  }

  // [其他頁面]預設內容
  getAllFilterData(temp, status) {
    let owner_name_res = {};
    let project_num_res = {};
    let city_res = [];

    // 業主名稱
    Object.values(temp).forEach(e => {
      Object.keys(e).forEach(el => {
        if(!owner_name_res.hasOwnProperty(el)) {
          owner_name_res[el] = e[el];
        } else {
          owner_name_res[el] = {...owner_name_res[el], ...e[el]};
        }
      })
    })
    // 專案編號
    Object.values(owner_name_res).forEach(e => {
      Object.keys(e).forEach(el => {
        if(!project_num_res.hasOwnProperty(el)) {
          project_num_res[el] = e[el];
        } else {
          project_num_res[el] = {...project_num_res[el], ...e[el]};
        }
      })
    })
    // 縣市
    Object.values(project_num_res).forEach((e: any) => {
      e.forEach(el => {
        if(!city_res.includes(el)) {
          city_res.push(el);
        }
      })
    })

    // 傳送訊息
    this.centerSVC.filterOwner$.next({
      owner_name_res: Object.keys(owner_name_res).sort(),
    })
    this.centerSVC.filterProject$.next({
      project_num_res: Object.keys(project_num_res).sort(),
    })
    this.centerSVC.filterCity$.next({
      city_res: city_res.sort()
    })
    this.centerSVC.filterTC$.next({
      data_type_res: this.data_type_res,
      project_num_res: Object.keys(project_num_res),
      city_res: city_res
    })

    if(status === 'default') {
      // 儲存初始內容(之後連動時進行資料過濾)
      this.owner_name_res = owner_name_res;
      this.project_num_res = project_num_res;
      this.city_res = city_res;
    }
    // 暫存專案編號
    this.project_num_temp = project_num_res;
  }

  // [其他頁面]變更業主名稱(依序往下連動專案編號/縣市/TC)
  changeOwnerFilter(temp) {
    let project_num_res = {};
    let city_res = [];

    // 專案編號
    Object.values(temp).forEach(e => {
      Object.keys(e).forEach(el => {
        if(!project_num_res.hasOwnProperty(el)) {
          project_num_res[el] = e[el];
        } else {
          project_num_res[el] = {...project_num_res[el], ...e[el]};
        }
      })
    })
    // 縣市
    Object.values(project_num_res).forEach((e: any) => {
      e.forEach(el => {
        if(!city_res.includes(el)) {
          city_res.push(el);
        }
      })
    })

    // 傳送訊息
    this.centerSVC.filterProject$.next({
      project_num_res: Object.keys(project_num_res).sort()
    })
    this.centerSVC.filterCity$.next({
      city_res: city_res.sort()
    })
    this.centerSVC.filterTC$.next({
      data_type_res: this.data_type_res,
      project_num_res: Object.keys(project_num_res),
      city_res: city_res
    })

    // 暫存專案編號
    this.project_num_temp = project_num_res;
  }

  // [其他頁面]變更專案編號(依序往下連動縣市/TC)
  changeProjectFilter(temp) {
    let city_res = [];

    // 縣市
    Object.values(temp).forEach((e: any) => {
      e.forEach(el => {
        if(!city_res.includes(el)) {
          city_res.push(el);
        }
      })
    })

    // 傳送訊息
    this.centerSVC.filterCity$.next({
      city_res: city_res
    })
    this.centerSVC.filterTC$.next({
      data_type_res: this.data_type_res,
      project_num_res: Object.keys(temp),
      city_res: city_res
    })

    // 暫存專案編號
    this.project_num_temp = temp;
  }

  // [其他頁面]變更縣市(依序往下連動TC)
  changeCityUploadFilter(temp) {
    // 傳送訊息
    this.centerSVC.filterTC$.next({
      data_type_res: this.data_type_res,
      project_num_res: Object.keys(this.project_num_temp),
      city_res: temp
    })
  }

  // [清單管理]變更業主名稱(依序往下連動專案編號)
  changeListOwnerFilter(temp) {
    let project_num_res = [];

    // 專案編號
    Object.values(temp).forEach((e: any) => {
      e.forEach(el => {
        if(!project_num_res.hasOwnProperty(el)) {
          project_num_res.push(el);
        }
      })
    })

    // 傳送訊息
    this.centerSVC.filterProject$.next({
      project_num_res: project_num_res.sort()
    })
  }

  // [清單管理]變更縣市(依序往下連動行政區/TC)
  changeCityAllFilter(temp) {
    let district_res = [];

    // 行政區
    Object.values(temp).forEach((e: any) => {
      e.forEach(el => {
        if(!district_res.includes(el)) {
          district_res.push(el);
        }
      })
    })

    // 傳送訊息
    this.centerSVC.filterDistrict$.next({
      district_res: district_res
    })
    this.centerSVC.filterTC$.next({
      city_res: Object.keys(temp),
      district_res: district_res
    })

    this.city_temp = Object.keys(temp);
  }

  // [清單管理]變更行政區(依序往下連動TC)
  changeDistrictFilter(temp) {
    // 傳送訊息
    this.centerSVC.filterTC$.next({
      city_res: this.city_temp,
      district_res: temp
    })
  }

  // 地圖查詢及下載
  search() {
    if (this.main_tc) {
      // 參數設定
      const req_body_tc = {
        district_new: this.district_new,
        tc_id: this.main_tc,
      };

      const req_body_uploaded = {
        data_type: this.data_type_multiple,
        tc_id: this.main_tc,
        owner_name: this.owner_name,
        project_num: this.project_number,
        district_new: this.district_new,
        time_start: this.time_date['date_start'],
        time_end: this.time_date['date_end'],
      };

      // 取得使用者篩選的TC資料
      this.centerSVC
        .post('/api/tc_road/search', req_body_tc)
        .subscribe({
          next: (res) => {
            this.all_tc_data = res['data'];

            // 傳訊息給main-map
            this.centerSVC.tcData$.next({
              tc_data: this.all_tc_data,
            });
          },
          error: (err) => {
            console.log(err);
            if (err.error.msg === 'Token has expired') {
              this.authService.signOut(); // token過期登出
            }
          }
        });

      // 取得使用者篩選的上傳紀錄資料
      this.centerSVC
        .post('/api/tc/search', req_body_uploaded)
        .subscribe({
          next: (res) => {
            this.all_uploaded_data = res['data'];

            // 傳訊息給main-map
            this.centerSVC.tcUploadedData$.next({
              tc_uploaded_data: this.all_uploaded_data,
            });
          },
          error: (err) => {
            console.log(err);
            if (err.error.msg === 'Token has expired') {
              this.authService.signOut(); // token過期登出
            }
          }
        });

      // 傳送搜尋條件
      this.centerSVC.clickSearch$.next({
        search: true,
        dataTypeMultiple: this.data_type_multiple, // 使用者選取的資料類型
        ownerName: this.owner_name, // 業主名稱
        projectNumber: this.project_number, // 專案編號
        districtNew: this.district_new, // 縣市
        mainTC: this.main_tc, // 使用者選取TC
        mainTCRoad: this.main_tc_road, // 使用者選取TC&路段
        timeDate: this.time_date // 使用者選取的資料時間
      })
      this.centerSVC.windowClick$.next(true);
    } else {
      this.centerSVC.remind('資料準備中，請稍後', 'brown', true);
    }
  }

  // 資料分析檢視
  analyze() {
    if(!this.tcSelectStatus) {
      this.centerSVC.remind('請選擇路口', 'red', false);
    } else if(!this.weekday) {
      this.centerSVC.remind('請選擇時段', 'red', false);
    } else {
      const req_body = {
        type: this.data_type,
        owner_name: this.owner_name,
        project_num: this.project_number,
        district_new: this.district_new,
        tc_id: this.main_tc,
        date_range : this.single_date, // 選擇日期(單一日期/空字串)
        weekday: this.weekday, // 時段選擇(平/假日)
      };

      // 取得分析資料
      this.centerSVC.post('/api/turning/statistics', req_body).subscribe({
          next: (res) => {
            if(Object.keys(res['data']).length === 0) {
              this.centerSVC.remind(res['message'], 'red', false); // 無資料
            } else {
              // 過濾出有正確分析結果的TC
              let filtered_tc = this.main_tc.filter(item => {
                if(!res['data']['skipping'].includes(item) && !res['data']['noFileError'].includes(item)) return item;
              });

              if(res['data']['skipping'].length === 0 && res['data']['noFileError'].length === 0) {
                // 傳送分析結果到各元件(全部正常)
                this.centerSVC.statisticsData$.next({
                  allData: res['data'],
                  mainTC: filtered_tc,
                  weekday: this.weekday, // 平假日
                  time_period: this.time_period, // 時間區間 ['06:00:00', '22:00:00']
                  time_ch_arr: this.time_ch_arr, // 區間敘述 ['平日全時段']
                  districtNew: this.district_new, // 縣市,
                  data_type: this.data_type // 資料類型(判斷是否顯示分析元件)
                });
              } else {
                // 傳送分析結果到各元件(部分正常)
                let skipping_str = '';
                let noFileError_str = '';
                if(res['data']['skipping'].length) {
                  skipping_str = `\n檔案內容：${res['data']['skipping'].join(",")}有異常，已將其過濾!`;
                }
                if(res['data']['noFileError'].length) {
                  noFileError_str = `\n找不到檔案：${res['data']['noFileError'].join(",")}`;
                }
                this.centerSVC.remind(`${skipping_str}${noFileError_str}`, 'red', true);

                if(filtered_tc.length !== 0) {
                  this.centerSVC.statisticsData$.next({
                    search: true,
                    allData: res['data'],
                    mainTC: filtered_tc,
                    weekday: this.weekday, // 平假日
                    time_period: this.time_period, // 時間區間 ['06:00:00', '22:00:00']
                    time_ch_arr: this.time_ch_arr, // 區間敘述 ['平日全時段']
                    districtNew: this.district_new, // 縣市
                  });
                }
              }
              this.centerSVC.windowClick$.next(true);
            }
          },
          error: (err) => {
            console.log(err);
            if(err.error.msg === 'Token has expired') {
              this.authService.signOut(); // token過期登出
            }
          }
        });
    }
  }

  // 資料庫查詢
  db_search() {
    if (this.main_tc) {
      // 參數設定
      const req_body_uploaded = {
        data_type: this.data_type_multiple,
        tc_id: this.main_tc,
        owner_name: this.owner_name,
        project_num: this.project_number,
        district_new: this.district_new,
        holiday_type: this.holiday_type,
        time_start: this.time_date['date_start'],
        time_end: this.time_date['date_end'],
      };

      // 取得使用者篩選的上傳紀錄資料
      this.centerSVC
        .post('/api/tc/search_v2', req_body_uploaded)
        .subscribe({
          next: (res) => {
            this.all_uploaded_data = res['data'];

            // 傳訊息給表格
            this.centerSVC.tcUploadedData$.next({
              tc_uploaded_data: this.all_uploaded_data,
            });
          },
          error: (err) => {
            console.log(err);
            if (err.error.msg === 'Token has expired') {
              this.authService.signOut(); // token過期登出
            }
          }
        });
      this.centerSVC.windowClick$.next(true);
    } else {
      this.centerSVC.remind('資料準備中，請稍後', 'brown', true);
    }
  }

  // 資料品質檢核
  quality() {
    if(!this.tcSelectStatus || this.main_tc.length < 2) {
      this.centerSVC.remind('請至少選擇兩個路口進行檢核', 'red', false);
    } else if(this.single_date === '') {
      this.centerSVC.remind('請選擇資料日期', 'red', false);
    } else {
      // this.main_tc = ['TC034', 'TC371', 'TC033'] // 南北向測試
      // this.main_tc = ['TC034', 'TC048'] // 東西向測試
      this.main_tc_road = this.main_tc_road.filter(e => this.main_tc.includes(e[0]));
      if (this.main_tc) {
        const req_body_tc = {
          district_new: this.district_new,
          tc_id: this.main_tc,
        };

        const req_body_uploaded = {
          data_type: '',
          tc_id: this.main_tc,
          owner_name: this.owner_name,
          project_number: this.project_number,
          district_new: this.district_new,
          time_start: '',
          time_end: '',
        };

        // 取得使用者篩選的TC資料
        this.centerSVC
          .post('/api/tc_road/search', req_body_tc)
          .subscribe({
            next: (res) => {
              this.all_tc_data = res['data'];
              this.centerSVC.tcData$.next({
                tc_data: this.all_tc_data,
              });
            },
            error: (err) => {
              console.log(err);
              if (err.error.msg === 'Token has expired') {
                this.authService.signOut(); // token過期登出
              }
            }
          });

        // 取得使用者篩選的上傳紀錄資料
        this.centerSVC
          .post('/api/tc/search', req_body_uploaded)
          .subscribe({
            next: (res) => {
              this.all_uploaded_data = res['data'];
              this.centerSVC.tcUploadedData$.next({
                tc_uploaded_data: this.all_uploaded_data,
              });
            },
            error: (err) => {
              console.log(err);
              if (err.error.msg === 'Token has expired') {
                this.authService.signOut(); // token過期登出
              }
            }
          });

        // 傳送訊息顯示對應頁面
        this.centerSVC.editSelect$.next({
          selectEditStep: 'basic',
          status: 'origin', // 待調整
          selectTC: this.main_tc_road,
          selectDate: this.single_date
        })

        // 傳送搜尋條件
        this.centerSVC.clickSearch$.next({
          search: true,
          mainTC: this.main_tc, // 使用者選取TC
          mainTCRoad: this.main_tc_road, // 使用者選取TC&路段
          districtNew: this.district_new, // 縣市
        })
        this.centerSVC.windowClick$.next(true);
      } else {
        this.centerSVC.remind('資料準備中，請稍後', 'brown', true);
      }
    }
  }

  // 調查檔案上傳
  async upload() {
    // 記錄上傳情況
    let allData = this.excel_upload.length; // 欲上傳的檔案數量
    let seccessData = 0; // 上傳成功
    let failData = 0; // 上傳失敗

    if (this.data_type && this.excel_upload) {
      this.centerSVC.windowClick$.next(true);

      // 列表設定
      this.centerSVC.uploadTest$.next({
        type: 'start',
        allFiles: this.excel_upload // 所有待上傳的檔案列表
      });

      // 檔案上傳(每個檔案自己打上傳API)
      for(const ele of this.excel_upload) {
        const formData = new FormData();
        formData.append('file', ele);
        formData.append('data_type', this.data_type);
        formData.append('commit', this.uploadCommit);
        const res = await this.centerSVC.post_excel('/api/tc/upload', formData).toPromise();

        let each_msg = '';
        try {
          if (res.msg === 'ok') {
            this.uploadCommit = ''; // 清空備註
            seccessData++;
            each_msg = '上傳成功';
          } else {
            failData++;
            each_msg = res.message;
          }
        } catch (err) {
          console.log(err);
          if (err.error && err.error.msg === 'Token has expired') {
            this.authService.signOut(); // token過期登出
          } else {
            failData++;
            each_msg = '上傳格式不符合';
          }
        }

        // 取得該筆資料上傳結果，傳訊息顯示狀態
        this.centerSVC.uploadTest$.next({
          type: 'one_file',
          now_file: ele['name'],
          msg: each_msg
        });
      }
      // 全部上傳完後，顯示最終結果
      let res_msg = '';
      if (failData > 0) {
        res_msg = `上傳完成，共${allData}個檔案。成功：${seccessData}個，失敗：${failData}個`;
        this.centerSVC.remind(res_msg, 'red', false);
      } else {
        res_msg = `上傳完成，共${allData}個檔案。`;
        this.centerSVC.remind(res_msg, 'green', false);
      }
    } else {
      // 待調整(設定清空this.excel的時間)
      this.centerSVC.remind('請選擇檔案', 'red', true);
    }
  }

  // 路口新增與維護
  edit() {
    if(this.main_tc) {
      this.centerSVC.clickSearch$.next({
        districtNew: this.district_new, // 使用者選取縣市
        mainTC: this.main_tc, // 使用者選取TC
      })
      this.centerSVC.windowClick$.next(true);
    } else {
      this.centerSVC.remind('資料準備中，請稍後', 'brown', true);
    }
  }

  // 路口新增與維護(路口定義左側確認按鈕顯示/隱藏)
  setSearchBtnDisplay() {
    if (this.router.url === '/setting/edit') {
      if(this.selectEditStep !== 'select') {
        return 'btn-none';
      }
    }
  }

  // 清單內容管理(確認搜尋條件)
  list_search() {
    // 根據子頁選擇表格要顯示的資料
    if(this.selectSubpage === 'owner') {
      const req_list_uploaded = {
        owner_name: this.owner_name,
        project_num: this.project_number,
        user_name: this.centerSVC['user_name']
      };
      // 取得使用者篩選的上傳紀錄資料
      this.centerSVC
      .post('/api/owner_project/owner_project_selected_data', req_list_uploaded)
      .subscribe({
        next: (res) => {
          // 傳給表格
          this.centerSVC.ownerUploadedData$.next({
            owner_uploaded_data: res['data'],
          });
          this.openList = true;
        },
        error: (err) => {
          console.log(err);
          if (err.error.msg === 'Token has expired') {
            this.authService.signOut();  // token過期登出
          }
        }
      });
      this.centerSVC.windowClick$.next(true);
    } else if(this.selectSubpage === 'road'){
      const req_list_uploaded = {
        city: this.city,
        district: this.district,
        tc_id: this.main_tc,
      };
      // 取得使用者篩選的上傳紀錄資料
      this.centerSVC
      .post('/api/tc_road/road_list_uploaded_data', req_list_uploaded)
      .subscribe({
        next: (res) => {
          // 傳給表格
          this.centerSVC.roadUploadedData$.next({
            road_uploaded_data: res['data'],
          });
          this.openList = true;
          // console.log('DB資料有 ', res['data'].length);
        },
        error: (err) => {
          console.log(err);
          if (err.error.msg === 'Token has expired') {
            this.authService.signOut(); // token過期登出
          }
        }
      });
      this.centerSVC.windowClick$.next(true);
    } else {
      this.centerSVC.remind('頁面選擇錯誤，請修正。', 'red', false);
    }
  }

  // 清單內容管理(右側按鈕位置)
  setListSaveBtnPosition() {
    if (this.router.url === '/back/list_manage') {
      if (this.openList) {
        return 'list-result-btn';
      } else {
        return 'btn-none';
      }
    }
  }

  // 儲存/取消/結束編輯
  saveResult(res) {
    if(res === 'save' || res === 'cancel') {
      this.centerSVC.saveResult$.next({
        editStep: this.selectEditStep,
        status: res,
      })
    } else if (res === 'back') {
      // 從edit-step執行回到路口選擇頁面流程
      this.centerSVC.backToStartFilter$.next(true);
    } else if (res === 'cancel_update') {     // 清單內容管理_取消編輯
      this.list_search();                               // renew表格
      this.insertedOwnerList = [];
      this.deletedOwnerList = [];
      this.updatedOwnerList = [];
      this.insertedRoadList = [];
      this.deletedRoadList = [];
      this.updatedRoadList = [];
      this.centerSVC.isListEditing = false;         // 將表格狀態恢復成無變更
      this.centerSVC.updateCleanAllStatus(true);    // 清空所有輸入欄位
      this.centerSVC.remind('取消編輯', 'green', true);
    } else if (res === 'update') {            // 清單內容管理_確認
      if(this.selectSubpage === 'owner') {
        // 業主名稱_新增
        if (this.insertedOwnerList.length > 0) {
          this.centerSVC
          .post('/api/owner_project/create_owner_project', this.insertedOwnerList)
          .subscribe({
            next: (res) => {
              console.log(res);
              this.insertedOwnerList = [];
            },
            error: (err) => {
              console.log(err);
              if (err.error.msg === 'Token has expired') {this.authService.signOut();}
              return;
            }
          });
        };
        // 業主名稱_刪除
        if (this.deletedOwnerList.length > 0) {
          this.centerSVC
          .post('/api/owner_project/delete_owner_project', this.deletedOwnerList)
          .subscribe({
            next: (res) => {
              console.log(res);
              this.deletedOwnerList = [];
            },
            error: (err) => {
              console.log(err);
              if (err.error.msg === 'Token has expired') {this.authService.signOut();}
              return;
            }
          });
        };
        // 業主名稱_更新
        if (this.updatedOwnerList.length > 0) {
          this.centerSVC
          .post('/api/owner_project/update_owner_project', this.updatedOwnerList)
          .subscribe({
            next: (res) => {
              console.log(res);
              this.updatedOwnerList = [];
            },
            error: (err) => {
              console.log(err);
              if (err.error.msg === 'Token has expired') {this.authService.signOut();}
              return;
            }
          });
        };
        this.list_search();   // renew表格
        this.centerSVC.remind('完成「業主名稱/專案編號」資料儲存。', 'green', true);
        this.centerSVC.isListEditing = false;
      } else if(this.selectSubpage === 'road'){
        // 路口清單_新增
        if (this.insertedRoadList.length > 0) {
          this.centerSVC
          .post('/api/tc_road/create_road', this.insertedRoadList)
          .subscribe({
            next: (res) => {
              console.log(res);
              this.insertedRoadList = [];
            },
            error: (err) => {
              console.log(err);
              if (err.error.msg === 'Token has expired') {this.authService.signOut();}
              return;
            }
          });
        };
        // 路口清單_刪除
        if (this.deletedRoadList.length > 0) {
          this.centerSVC
          .post('/api/tc_road/delete_road', this.deletedRoadList)
          .subscribe({
            next: (res) => {
              console.log(res);
              this.deletedRoadList = [];
            },
            error: (err) => {
              console.log(err);
              if (err.error.msg === 'Token has expired') {this.authService.signOut();}
              return;
            }
          });
        };
        // 路口清單_更新
        if (this.updatedRoadList.length > 0) {
          this.centerSVC
          .post('/api/tc_road/update_road', this.updatedRoadList)
          .subscribe({
            next: (res) => {
              console.log(res);
              this.updatedRoadList = [];
            },
            error: (err) => {
              console.log(err);
              if (err.error.msg === 'Token has expired') {this.authService.signOut();}
              return;
            }
          });
        };
        this.list_search();      // renew表格
        this.centerSVC.remind('完成「路口清單」資料儲存。', 'green', true);
        this.centerSVC.isListEditing = false;       // 將表格狀態恢復成無變更
      }
    }
  }

  // 上傳中避免使用者點選登出
  isUploadingData() {
    if (this.upload_status) {
      return 'is-uploading';
    } else {
      return '';
    }
  }

  // filter位置
  pageWithSubpage() {
    // 正常: filter_general/往下: filter_test/不顯示: filter_none
    let pageList = ['quality', 'edit', 'list_manage'];
    if(!pageList.includes(this.page)) {
      return 'filter_general';
    } else {
      // 品質檢核
      if(this.page === 'quality') {
        if(this.step === 'basic') {
          return 'filter_general';
        } else {
          return 'filter_down';
        }
      }
      // 路口編輯
      if(this.page === 'edit') {
        if(this.selectEditStep === 'drawing') {
          return 'filter_none';
        } else {
          return 'filter_down';
        }
      }
      // 清單管理
      if(this.page === 'list_manage') {
        return 'filter_down';
      }

    }
  }

  ngAfterViewInit(): void {
    const viewContainerRef = this.dynamicComponentLoader.viewContainerRef;
    // 清除元件
    viewContainerRef.clear();
    this.filter_cfgs['components'].forEach((item, idx) => {
      // 動態產出模塊
      const componentRef = viewContainerRef.createComponent(
        this.dynamicComponentLoader.component_map[item.name]
      );
      // 新增item class
      this.renderer.addClass(
        componentRef.location.nativeElement,
        'filter_item'
      );

      // 每個元件設定z-index(越後面的越低)
      const zIndexValue = 999999 - idx;
      this.renderer.setStyle(componentRef.location.nativeElement, 'z-index', zIndexValue.toString());
      this.renderer.setStyle(componentRef.location.nativeElement, 'position', 'relative');
      // 設定input
      // componentRef.instance['cfg'] = item.cfg;
      componentRef.instance['component_idx'] = idx;
    });
    // 重新同步動態生成子元件初始化數值
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
