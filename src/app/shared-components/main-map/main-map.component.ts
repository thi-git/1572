import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { CenterService } from '../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import "leaflet-rotatedmarker";

@Component({
  selector: 'app-main-map',
  templateUrl: './main-map.component.html',
  styleUrls: ['./main-map.component.scss'],
})
export class MainMapComponent implements OnInit, OnDestroy {
  user = '';
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  // 圖層配置
  baseMap = L.tileLayer(
    'https://api.mapbox.com/styles/v1/{id}/tiles/256/{z}/{x}/{y}?access_token={accessToken}',
    {
      maxZoom: 20,
      id: 'esther2916/clfjdnq7a000101oz4d6e5uyb',
      accessToken: 'pk.eyJ1IjoiZXN0aGVyMjkxNiIsImEiOiJjbGZxZ3dsZDAwajFqM3lwZjhua3Y1dTJnIn0.C5v_Bj4AfvBrdWXLfuS8fA',
    }
  );
  lightMap = L.tileLayer(
    'https://api.mapbox.com/styles/v1/{id}/tiles/256/{z}/{x}/{y}?access_token={accessToken}',
    {
      maxZoom: 20,
      id: 'esther2916/ckqqbbzc24kvk18pb646nlfqe',
      accessToken: 'pk.eyJ1IjoiZXN0aGVyMjkxNiIsImEiOiJjbGZxZ3dsZDAwajFqM3lwZjhua3Y1dTJnIn0.C5v_Bj4AfvBrdWXLfuS8fA',
    }
  );
  // 地圖參數
  MapOptions = {
    layers: [],
    attributionControl: false,
    zoomControl: true,
    minZoom: 7,
  };
  // 地圖中心
  mapCenter = {
      latlng: L.latLng(25.0514376, 121.5353965), // 中心位置(台北)
      zoom: 14, // 預設zoom值
    };

  // 地圖設定
  theme: string;
  mapInstance: any;
  CurrentMapLayers = [];
  zoomLevel: number = 14; // 偵測zoom值

  // 地圖框選參數
  page: any; // 以頁面判斷是否需顯示框選按鈕及開啟地圖框選功能
  selectModeOpen = false; // 使否打開地圖框選(由tc-select tab觸發)
  isSelecting: boolean = false; // 是否為地圖框選狀態(由框選按鈕觸發)
  latlngs = []; // 記錄滑鼠按下時的座標
  selectedScope; // 紀錄框選範圍
  tcGroup: any; // TC圖層(用於清空圖層)
  positionData: any = []; // 儲存使用者選擇的TC資料
  uploadedData: any = []; // 儲存上傳紀錄資料
  openDataList = false; // 是否顯示右側資料列表
  districtNew = [];

  constructor(
    public dialog: MatDialog,
    private router: Router,
    private centerService: CenterService,
    private authService: AuthService,
  ) {
    // 是否為地圖框選模式
    this.centerService.isMapSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res) {
          this.selectModeOpen = true;
          this.getDefaultData(); // 顯示基本圖資
        } else {
          this.selectModeOpen = false;
          this.cancelMapSelect(); // 取消框顯紀錄
        }
      })
  }

  ngOnInit(): void {
    this.user = this.centerService.user_name;

    if (this.user == 'eland_gov') {
      this.mapCenter = {
        latlng: L.latLng(24.755549, 121.762257), // 中心位置(台北)
        zoom: 14, // 預設zoom值
      };
    } else {
      this.mapCenter = {
        latlng: L.latLng(25.0514376, 121.5353965), // 中心位置(台北)
        zoom: 14, // 預設zoom值
      };
    }

    this.page = this.router.url; // 頁面設定

    // 訂閱主題
    this.centerService.theme$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((theme) => {
        this.theme = theme;
      });

    // 訂閱確認按鈕
    this.centerService.clickSearch$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res['search']) {
          this.openDataList = true;
          this.districtNew = res['districtNew'];
          this.cancelBtn(); // 清除之前框選的內容/狀態
          this.getSearchData();
        }
    })

    // 訂閱圖層開關
    this.centerService.mapControl$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.mapControlDisplay(res);
    })

    // 視窗點擊偵測
    document.getElementById('search_page_map').addEventListener('click', (e) => {
      this.centerService.windowClick$.next(true);
    })
  }

  onMapReady(map: any) {
    this.mapInstance = map;
    const afterMapReady = new Promise<void>((resolve, reject) => {
      if (this.mapInstance !== undefined) {
        resolve();
      } else {
        reject();
      }
    });

    // 偵測地圖zoom值重新設定marker樣式
    this.mapInstance.on('zoom', () => {
      this.zoomLevel = this.mapInstance.getZoom();
      if(typeof this.tcGroup !== 'undefined') {
        if(this.zoomLevel > 15) {
          Object.values(this.tcGroup._layers).forEach((layer: any) => {
            let newIcon = L.icon({iconUrl: layer.options.icon.options.iconUrl, iconSize: [32, 33]});
            layer.setIcon(newIcon);
          })
        } else if (this.zoomLevel === 15) {
          Object.values(this.tcGroup._layers).forEach((layer: any) => {
            let newIcon = L.icon({iconUrl: layer.options.icon.options.iconUrl, iconSize: [24, 24]});
            layer.setIcon(newIcon);
          })
        } else if (this.zoomLevel === 14) {
          Object.values(this.tcGroup._layers).forEach((layer: any) => {
            let newIcon = L.icon({iconUrl: layer.options.icon.options.iconUrl, iconSize: [18, 18]});
            layer.setIcon(newIcon);
          })
        } else if(this.zoomLevel <= 13) {
          Object.values(this.tcGroup._layers).forEach((layer: any) => {
            let newIcon = L.icon({iconUrl: layer.options.icon.options.iconUrl, iconSize: [11, 11]});
            layer.setIcon(newIcon);
          })
        }
      }
    })
  }

  // 點選確定後取得資料呈現marker
  getSearchData() {
    // 取得TC點位資料(含status)
    const p1 = new Promise<void>((resolve, reject) => {
      this.centerService.tcData$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(res => {
        if(res) {
          this.positionData = res['tc_data'].map(e => {
            e['show'] = true;
            return e;
          })
          resolve();
        }
      })
    })

    // 取得上傳紀錄資料
    const p2 = new Promise<void>((resolve, reject) => {
      this.centerService.tcUploadedData$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(res => {
        this.uploadedData = res['tc_uploaded_data'];
        resolve();
      })
    })

    // TC點位&狀態資料和上傳紀錄資料都有拿到才執行後面邏輯
    Promise.all([p1, p2]).then(() => {
      if(this.page === '/view/search') {
        this.iconSetting('search');

        // 設定地圖的中心位置
        if(this.districtNew.length === 1) {
          switch(this.districtNew[0]) {
            case '新竹市':
              this.flyto([24.8063117, 120.960879], 16);
              break;
            case '台北市':
              this.flyto([25.0514376, 121.5353965], 14);
              break;
            case '宜蘭縣':
              this.flyto([24.755549, 121.762257], 14);
              break;
            default:
              this.flyto([25.0514376, 121.5353965], 14);
              break;
          }
        } else {
          this.flyto([25.0514376, 121.5353965], 14); // 預設(暫定北市)
        }
      }
    })
  }

  // 地圖定位
  flyto(center: number[], zoom) {
    this.mapInstance.flyTo(center, zoom, {
      animate: false,
      // duration: 1
    });
  }

  // 打開地圖框選後呈現基本marker
  getDefaultData() {
    this.centerService.get('/api/turning/status').subscribe({
      next: (res) => {
        this.positionData = res['data'].map(e => {
          e['show'] = true;
          return e;
        })
        this.iconSetting('default');
      },
      error: (err) => {
        console.log(err);
        if (err.error.msg === 'Token has expired') {
          this.authService.signOut(); // token過期登出
        }
      }
    });
  }

  // 關閉地圖框選後清空設定(待調整，確認最理想的操作流程)
  cancelMapSelect() {
    if(typeof this.tcGroup !== 'undefined') {
      this.tcGroup.remove(); // 清除框選範圍
    }

    // 傳訊息給tc-select元件
    this.centerService.sendMapSelectResult$.next({
      mapSelectResult: []
    })

    this.cancelBtn();
  }

  // 設定icon(不同zoom值)
  iconSetting(select_type) {
    // icon種類設定
    let icon_type = {
      upload_data: L.icon({iconUrl: 'assets/icons/map_tc_upload.png', iconSize: [32, 33]}),
      setting_data: L.icon({iconUrl: 'assets/icons/map_tc_setting.svg', iconSize: [32, 33]}),
      no_data: L.icon({iconUrl: 'assets/icons/map_tc_no.png', iconSize: [32, 33]}),
    }

    if(this.zoomLevel > 15) {
      icon_type['upload_data'] = L.icon({iconUrl: 'assets/icons/map_tc_upload.png', iconSize: [32, 33]});
      icon_type['setting_data'] = L.icon({iconUrl: 'assets/icons/map_tc_setting.svg', iconSize: [32, 33]});
      icon_type['no_data'] = L.icon({iconUrl: 'assets/icons/map_tc_no.png', iconSize: [32, 33]});
    } else if (this.zoomLevel === 15) {
      icon_type['upload_data'] = L.icon({iconUrl: 'assets/icons/map_tc_upload.png', iconSize: [24, 24]});
      icon_type['setting_data'] = L.icon({iconUrl: 'assets/icons/map_tc_setting.svg', iconSize: [24, 24]});
      icon_type['no_data'] = L.icon({iconUrl: 'assets/icons/map_tc_no.png', iconSize: [24, 24]});
    } else if (this.zoomLevel === 14) {
      icon_type['upload_data'] = L.icon({iconUrl: 'assets/icons/map_tc_upload.png', iconSize: [18, 18]});
      icon_type['setting_data'] = L.icon({iconUrl: 'assets/icons/map_tc_setting.svg', iconSize: [18, 18]});
      icon_type['no_data'] = L.icon({iconUrl: 'assets/icons/map_tc_no.png', iconSize: [18, 18]});
    } else if(this.zoomLevel <= 13) {
      icon_type['upload_data'] = L.icon({iconUrl: 'assets/icons/map_tc_upload.png', iconSize: [11, 11]});
      icon_type['setting_data'] = L.icon({iconUrl: 'assets/icons/map_tc_setting.svg', iconSize: [11, 11]});
      icon_type['no_data'] = L.icon({iconUrl: 'assets/icons/map_tc_no.png', iconSize: [11, 11]});
    }

    // search => 點選確定後呈現marker, default => 打開地圖框選呈現marker
    if(select_type === 'search') {
      this.markerLayoutSearch(icon_type);
    } else if(select_type === 'default') {
      this.markerLayoutDefault(icon_type);
    }
  }

  // 在地圖上呈現TC Marker(點選確定後呈現marker)
  markerLayoutSearch(icon_type) {
    // 有資料的路口arr
    let uploaded_arr = [];
    this.uploadedData.forEach((e) => {
      uploaded_arr.push(Object.keys(e)[0]);
    })

    // 清空原有的marker
    const layers = [];
    if(typeof this.tcGroup !== 'undefined') {
      this.tcGroup.clearLayers();
    }

    // 將資料marker呈現在地圖上
    this.positionData.forEach((e: any) => {
      // 判斷該TC有無上傳紀錄資料
      // 有: 將紀錄資料加入該TC
      // 無: 給一個空陣列
      if(uploaded_arr.includes(e['tc_id'])) {
        let filterupload = this.uploadedData.filter(el => {
          if(Object.keys(el)[0] === e['tc_id']) return el;
        })
        e['uploadData'] = filterupload.map(d => d[e['tc_id']])
      } else {
        e['uploadData'] = [];
      }

      // 依照上傳資料設定狀態(受資料類型和時間範圍影響，變成無上傳紀錄者要重設status)
      if(e['uploadData'].length > 0) {
        if(e['uploadData'][0]['volume']) {
          e['volume'] = true;
        }
        if(e['uploadData'][0]['delay']) {
          e['delay'] = true;
        }
      } else {
        e['turning'] = false;
        e['volume'] = false;
        e['delay'] = false;
      }

      let iconType;
      if(uploaded_arr.includes(e['tc_id']) && e['turning']) {
        iconType = icon_type.setting_data; // 有上傳/有編輯
      } else if(uploaded_arr.includes(e['tc_id']) && !e['turning']) {
        iconType = icon_type.upload_data; // 有上傳/無編輯
      } else {
        iconType = icon_type.no_data; // 無任何紀錄
      }

      let layer: any = L.marker([e.lat, e.lng], {icon: iconType})
      .bindTooltip(`${e.tc_id} ${e.road}`, { offset: L.point({ x: 0, y: -20 }), direction: 'top' }).openTooltip();

      layer._id = e['tc_id'];
      layer._status = e.turning ? 'setting_data' : (e.volume) ? 'upload_data' : 'no_data';
      layer._show = true;
      layers.push(layer); // 將marker加到layers
    })

    this.tcGroup = L.layerGroup(layers);
    this.mapInstance.addLayer(this.tcGroup); // 呈現在地圖上

    // 預設不顯示無資料圖層
    // Object.values(this.tcGroup._layers).forEach(layer => {
    //   if(layer['_status'] === 'no_data') {
    //     this.mapInstance.removeLayer(layer);
    //   }
    // })

    // 傳資訊給data-list元件
    this.centerService.tcSelected$.next({
      isSelecting: true,
      selectedTC: this.positionData
    })
  }

  // 在地圖上呈現TC Marker(打開地圖框選呈現marker)
  markerLayoutDefault(icon_type) {
    // 清空原有的marker
    const layers = [];
    if(typeof this.tcGroup !== 'undefined') {
      this.tcGroup.clearLayers();
    }

    // 將資料marker呈現在地圖上
    this.positionData.forEach((e: any) => {
      let iconType;
      if(e['turning']) {
        iconType = icon_type.setting_data;
      } else if(e['volume']) {
        iconType = icon_type.upload_data;
      } else {
        iconType = icon_type.no_data;
      }

      let layer: any = L.marker([e.lat, e.lng], {icon: iconType})
      .bindTooltip(`${e.tc_id} ${e.road}`, { offset: L.point({ x: 0, y: -20 }), direction: 'top' }).openTooltip();

      layer._id = e['tc_id'];
      layer._status = e.turning ? 'setting_data' : (e.volume) ? 'upload_data' : 'no_data';
      layer._show = true;
      layers.push(layer); // 將marker加到layers
    })

    this.tcGroup = L.layerGroup(layers);
    this.mapInstance.addLayer(this.tcGroup); // 呈現在地圖上
  }

  // 開啟地圖框選功能
  selectBtn() {
    this.isSelecting = true;
    this.mapInstance.dragging.disable(); // 取消地圖平移功能
    let tempSelect; // 暫時框選

    this.mapInstance
    // 滑鼠按下時觸發
    .on('mousedown', (e: any) => {
      // 清除原有資料
      this.latlngs.length = 0;
      if(typeof tempSelect !== 'undefined'){
        tempSelect.remove();
      }
      if(typeof this.selectedScope !== 'undefined'){
        this.selectedScope.remove();
      }

      // 紀錄起始座標
      this.latlngs[0] = [e.latlng.lat, e.latlng.lng];

      // 繪製框選線條
      this.mapInstance.on('mousemove', (e: any) => {
        // 紀錄滑鼠經過的座標
        this.latlngs.push([e.latlng.lat, e.latlng.lng]);

        if(typeof tempSelect !== 'undefined'){
          tempSelect.remove();
        }
        tempSelect = L.polyline(this.latlngs, {color: '#005581'}).addTo(this.mapInstance);
      })
    })
    .on('mouseup', (e: any) => {
      this.mapInstance.off('mousemove');
      tempSelect.remove(); // 移除暫時框選

      // 繪製框選範圍
      this.selectedScope = L.polygon(this.latlngs, {color: '#005581', fillColor: '#005581', weight: 2}).addTo(this.mapInstance);
      this.getSelectedTC();
    })
  }

  // 將有框選到的TC存入陣列
  getSelectedTC() {
    let selectData = [];
    // 查看每一個TC資料，是否在框選範圍內，有就就存為框選資料
    this.positionData.forEach((e: any) => {
      if(e['show']) {
        const point = [e['lat'], e['lng']];
        if(this.isMarkerInsidePolygon(point, this.latlngs)) {
          selectData.push(e['tc_id'])
        }
      }
    })

    // 傳訊息給tc-select元件
    this.centerService.sendMapSelectResult$.next({
      mapSelectResult: selectData
    })
  }

  // 判斷TC是否存在於框選範圍內(公式)
  isMarkerInsidePolygon(point: any, vs: any) {
    const x = point[0], y = point[1];
    let inside = false;

    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];

      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) { inside = !inside; }
    }
    return inside;
  }

  // 取消框選功能
  cancelBtn() {
    this.isSelecting = false;
    this.mapInstance.dragging.enable();
    this.mapInstance.off('mousedown');
    this.mapInstance.off('mousemove');
    this.mapInstance.off('mouseup');
    if(typeof this.selectedScope !== 'undefined'){
      this.selectedScope.remove(); // 清除框選範圍
    }
  }

  // 圖層開關顯示設定
  mapControlDisplay(control) {
    let show = [];
    let hide = [];

    // 橘色
    if(control.uploadStatus) {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'upload_data') {
          this.mapInstance.addLayer(layer);
          show.push(layer['_id']);
        }
      })
    } else {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'upload_data') {
          this.mapInstance.removeLayer(layer);
          hide.push(layer['_id']);
        }
      })
    }

    // 綠色
    if(control.settingStatus) {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'setting_data') {
          this.mapInstance.addLayer(layer);
          show.push(layer['_id']);
        }
      })
    } else {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'setting_data') {
          this.mapInstance.removeLayer(layer);
          hide.push(layer['_id']);
        }
      })
    }

    // 灰色
    if(control.nodataStatus) {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'no_data') {
          this.mapInstance.addLayer(layer);
          show.push(layer['_id']);
        }
      })
    } else {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'no_data') {
          this.mapInstance.removeLayer(layer);
          hide.push(layer['_id']);
        }
      })
    }

    this.positionData = this.positionData.map((e) => {
      if(show.length > 0) {
        if(show.includes(e['tc_id'])) {
          e['show'] = true;
        }
      }

      if(hide.length > 0) {
        if(hide.includes(e['tc_id'])) {
          e['show'] = false;
        }
      }

      return e;
    })
  }

  // 側邊欄與右側列表的狀態設定框選btn位置
  changeBtnPos() {
    if(this.openDataList && !this.centerService.sidebarOpenTest) {
      return 'change_btn_pos';
    } else if(this.openDataList && this.centerService.sidebarOpenTest) {
      return 'change_btn_pos_v2';
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}

