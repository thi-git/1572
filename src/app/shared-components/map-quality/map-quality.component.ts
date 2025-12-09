import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { CenterService } from '../../pages/center.service';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import "leaflet-rotatedmarker";

@Component({
  selector: 'app-map-quality',
  templateUrl: './map-quality.component.html',
  styleUrls: ['./map-quality.component.scss']
})
export class MapQualityComponent implements OnInit {
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
  lightMap = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/256/{z}/{x}/{y}?access_token={accessToken}',
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
  isSelecting: boolean; // 是否為地圖框選狀態(由框選按鈕觸發)
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
    private centerService: CenterService
  ) {
    // 是否為地圖框選模式
    this.centerService.isMapSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res) {
          this.selectModeOpen = true;
        } else {
          this.selectModeOpen = false;
        }
      })
  }

  ngOnInit(): void {
    this.page = this.router.url; // 頁面設定

    // 切換主題
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
      .subscribe((res)=>{
        this.mapControlDisplay(res);
    })

    // 訂閱allTC資料(預設顯示全部TC)
    this.centerService.tcAllData$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.positionData = res['tc_all_data'].map(e => {
          e['show'] = true;
          return e;
        })
        this.iconSetting();
    });

    // 視窗點擊偵測
    document.getElementById('quality_page_map').addEventListener('click', (e)=>{
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
    this.centerService.tcData$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((res) => {
      if(res) {
        this.positionData = res['tc_data'].map(e => {
          e['show'] = true;
          return e;
        })
        if(this.page === '/view/quality') {
          this.iconSetting();

          // 設定地圖的中心位置
          if(this.districtNew.length === 1) {
            switch(this.districtNew[0]) {
              case '新竹市':
                this.flyto([24.8063117, 120.960879], 16);
                break;
              case '台北市':
                this.flyto([25.0514376, 121.5353965], 14);
                break;
              default:
                this.flyto([25.0514376, 121.5353965], 14);
                break;
            }
          } else {
            this.flyto([25.0514376, 121.5353965], 14); // 預設(暫定北市)
          }
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

  // 設定icon(不同zoom值)
  iconSetting() {
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

    this.markerLayout(icon_type);
  }

  // 在地圖上呈現TC Marker
  markerLayout(icon_type) {
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
      } else if(e['volume'] || e['delay']) {
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

    // 預設不顯示無資料圖層
    Object.values(this.tcGroup._layers).forEach(layer => {
      if(layer['_status'] === 'no_data') {
        this.mapInstance.removeLayer(layer);
      }
    })
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
    let testData = [];
    // 查看每一個TC資料，是否在框選範圍內，有就就存為框選資料
    this.positionData.forEach((e: any) => {
      if(e['show']) {
        const point = [e['lat'], e['lng']];
        if(this.isMarkerInsidePolygon(point, this.latlngs)){
          testData.push(e['tc_id'])
        }
      }
    })

    // 傳訊息給tc-select元件
    this.centerService.sendMapSelectResult$.next({
      mapSelectResult: testData
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

  // 側邊欄與右側列表的狀態設定框選btn位置(待調整)
  changeBtnPos() {
    if(this.openDataList) {
      return 'change_btn_pos';
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
