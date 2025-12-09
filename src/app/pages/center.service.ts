import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

// main-map.interface
import { MapOrder } from '../shared-components/main-map/interface/main-map.interface';
import * as _ from 'lodash';

function _window(): any {
  return window;
}

const config = {
  serverIP: environment.serverIP,
  authIP: environment.authIP,

  // 一般頁面的reqHeader
  reqHeader: new HttpHeaders({
    'Content-Type': 'application/json',
    'access-control-allow-origin': '*',
    authorization: 'Bearer ' + localStorage.getItem('token'), // JWT放這裡
  }),
  // 上傳頁面的reqHeader
  reqHeaderExcel: new HttpHeaders({
    authorization: 'Bearer ' + localStorage.getItem('token'), // JWT放這裡
  }),
};

@Injectable({
  providedIn: 'root',
})
export class CenterService {
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object,
    private snackBar: MatSnackBar
  ) {}

  // 傳遞目前主題
  theme$ = new BehaviorSubject('light-theme'); // 預設
  // 傳遞地圖經緯度
  map$ = new Subject<MapOrder>();
  // 視窗點擊
  windowClick$ = new Subject<boolean>();
  // 確認按鈕
  clickSearch$ = new Subject();
  // 傳遞在filter撈好的TC資料
  tcData$ = new Subject();
  // 傳遞在filter撈好的上傳紀錄資料
  tcUploadedData$ = new Subject();
  // 傳遞在filter撈好的資料(業主名稱)
  ownerUploadedData$ = new Subject();
  // 傳遞在filter撈好的資料(路口清單)
  roadUploadedData$ = new Subject();
  // 圖層開關
  mapControl$ = new Subject();
  // 地圖框選到的TC
  tcSelected$ = new Subject();
  // 上傳狀態傳遞
  uploadStatus$ = new Subject();
  // 開啟框選模式
  selectMode$ = new Subject<boolean>();
  // 側邊欄開合
  isSidebarOpen$ = new Subject();

  // excel
  excelPreview$ = new Subject<File>();
  excelUpload$ = new Subject(); // new Subject<File>();
  uploadResData$ = new Subject();
  uploadTest$ = new Subject();

  // 地圖框選
  isMapSelect$ = new Subject();
  sendMapSelectResult$ = new Subject();

  // filter
  dataType$ = new Subject<String>();
  dataTypeMultiple$ = new Subject();
  ownerName$ = new Subject();
  projectNumber$ = new Subject();
  holidayType$ = new Subject();
  mainRoad$ = new Subject();
  timeDate$ = new Subject();
  intersectionType$ = new Subject<String>();
  weekdays$ = new Subject<{ name: string, value: number }>();
  timePeriod$ = new Subject();
  singleDateTest$ = new Subject();
  tcAllData$ = new Subject();
  tcSmallCardChangePosition$ = new Subject();

  city$ = new Subject();
  district$ = new Subject();
  districtNew$ = new Subject();

  // 編輯頁面
  editSelect$ = new Subject(); // 選擇編輯步驟
  saveResult$ = new Subject(); // 儲存/取消結果
  backToStart$ = new Subject(); // 回到路口選擇(待調整)
  backToStartFilter$ = new Subject(); // 右側結束編輯(待調整)
  changeTCIcon$ = new Subject(); // 檢查是否須修正icon顏色
  isEditing$ = new Subject(); // 切頁時傳訊息判斷元件狀態
  isEditing = false; // 切頁時判定是否在編輯中
  isMoving = false; // 切頁時判定是否正在執行地圖事件
  tc_id = '';
  markerLatLng = [];
  // 路口定義
  editStatus$ = new Subject(); // 編輯狀態設定(開始編輯/結束編輯)
  selectedRoadMarker$ = new Subject(); // 選擇的編輯路段
  selectedArrowDirection$ = new Subject(); // 選擇的箭頭轉向
  clickMarker$ = new Subject(); // 從地圖點選marker直接進行編輯
  afterSaveOrCancel$ = new Subject(); // 儲存或取消後將marker樣式復原
  getOldData$ = new Subject(); // 取消編輯後取得原本資料(待調整)
  // 路段繪製
  sendRoadSectionInfo$ = new Subject();
  sendSelectedRoad$ = new Subject();
  tempFinish$ = new Subject();

  // 路段資料分析
  statisticsData$ = new Subject(); // 路段資料分析資料

  // 取得地圖目前經緯度
  mapCenter = {
    lat: 24.8063117,
    lng: 120.960879,
    zoom: 14,
  };

  // 清單內容管理
  isListEditing = false;                // 切頁時判定是否送出編輯內容
  insertedOwnerList$ = new Subject();
  updatedOwnerList$ = new Subject();
  deletedOwnerList$ = new Subject();
  insertedRoadList$ = new Subject();
  updatedRoadList$ = new Subject();
  deletedRoadList$ = new Subject();

  sidebarOpenTest = false;
  user_name = '';

  // 傳送filter資料
  filterOwner$ = new Subject();
  filterProject$ = new Subject();
  filterCity$ = new Subject();
  filterTC$ = new Subject();
  filterDistrict$ = new Subject();
  filterAllCity$ = new Subject();

  // filter連動
  changeFilter$ = new Subject();

  // 資料檢核
  sendBasicData$ = new Subject();
  sendResultReq$ = new Subject();

  // 測試(之後整理)
  canClickTC$ = new Subject();
  clickTC$ = new Subject();
  selectSingleDate$ = new Subject();
  test$ = new Subject(); // 傳送路口編輯每頁編輯的狀態

  setAuthDataTest;

  // get方法
  public get(url): Observable<any> {
    const URL = config.serverIP + url;
    return this.http.get<any>(URL, { headers: config.reqHeader });
  }

  // post方法
  public post(url, data): Observable<any> {
    const URL = config.serverIP + url;
    return this.http.post<any>(URL, data, { headers: config.reqHeader });
  }

  // postexcel方法
  public post_excel(url, data): Observable<any> {
    const URL = config.serverIP + url;
    return this.http.post<any>(URL, data, { headers: config.reqHeaderExcel });
  }
  // delete方法
  public delete(url): Observable<any> {
    const URL = config.serverIP + url;
    return this.http.delete<any>(URL, { headers: config.reqHeader });
  }

  // put方法
  public put(url, data): Observable<any> {
    const URL = config.serverIP + url;
    return this.http.put<any>(URL, data, { headers: config.reqHeader });
  }

  get nativeWindow(): any {
    if (isPlatformBrowser(this.platformId)) {
      return _window();
    }
  }

  public set_token(token) {
    config.reqHeader = config.reqHeader.set('authorization', 'Bearer ' + token);
    config.reqHeaderExcel = config.reqHeaderExcel.set('authorization', 'Bearer ' + token);
  }

  // 讀取使用者設定
  public get_all_page_cfg() {
    let pages_data = JSON.parse(localStorage.getItem('1493cfg'));
    return pages_data;
  }

  // 讀取第一層分頁
  public get_lv1_cfg(url) {
    let pages_data = JSON.parse(localStorage.getItem('1493cfg'));
    let path_lv1 = url.split('/')[1];
    let lv1 = _.find(pages_data, { router: path_lv1 });
    if (typeof lv1 == "undefined") return [];
    return lv1.page_configs;
  }

  // 讀取第二層分頁
  public get_lv2_cfg(url) {
    let pages_data = JSON.parse(localStorage.getItem('1493cfg'));
    let path_lv1 = url.split('/')[1];
    let lv1 = _.find(pages_data, { router: path_lv1 });
    let path_lv2 = url.split('/')[1] + '/' +  url.split('/')[2];
    let lv2 = _.find(lv1.child_page, { router: path_lv2 });
    if (typeof lv2 == 'undefined') return [];
    return lv2.page_configs;
  }

  // 讀取第一層Filter元件
  public get_filter_cfg(url) {
    let filter = _.find(this.get_lv1_cfg(url));
    filter = filter.find(e => e.name == 'Filter')
    if(filter['components'].length > 0) {
      return filter;
    } else {
      return [];
    }
  }

  // 讀取第二層Filter元件
  public get_lv2_filter_cfg(url) {
    let filter = _.find(this.get_lv2_cfg(url));
    filter = filter.find((e) => e.name == 'Filter');
    if (filter['components'].length > 0) {
      return filter;
    } else {
      return [];
    }
  }

  // 取消編輯
  private cleanAllStatus = new BehaviorSubject<boolean>(false);
  isCleanAll = this.cleanAllStatus.asObservable();

  updateCleanAllStatus(status: boolean) {
    this.cleanAllStatus.next(status);
  }

  // snackbar提示設定
  remind(text, color, autoFade) {
    let snackbarColor = '';
    let snackbarFade = 0;
    if (color === 'red') {
      snackbarColor = 'snack-bar-setting-red';
    } else if (color === 'green') {
      snackbarColor = 'snack-bar-setting-green';
    } else if (color === 'brown') {
      snackbarColor = 'snack-bar-setting-brown';
    }
    if (autoFade) {
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
}
