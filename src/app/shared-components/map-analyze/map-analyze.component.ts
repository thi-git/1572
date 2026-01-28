import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { CenterService } from '../../pages/center.service';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import "leaflet-rotatedmarker";

@Component({
  selector: 'app-map-analyze',
  templateUrl: './map-analyze.component.html',
  styleUrls: ['./map-analyze.component.scss']
})
export class MapAnalyzeComponent implements OnInit, OnDestroy {
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
  isSelecting: boolean = false; // 是否為地圖框選狀態(由框選按鈕觸發)
  latlngs = []; // 記錄滑鼠按下時的座標
  selectedScope; // 紀錄框選範圍
  tcGroup: any; // TC圖層(用於清空圖層)
  positionData: any = []; // 儲存使用者選擇的TC資料
  uploadedData: any = []; // 儲存上傳紀錄資料

  // 時間軸配置
  showTimeLine = false;
  timeLineIdx: number;
  timeArr = [];

  // 路段圖層
  roadDrawGroup: any;

  // 折線圖資料
  sectionDataFormatted;

  data_type = 'volume';
  viewingTC = []; // 使用者選取的TC
  canClickTC: boolean = false; // 點選確定後才偵測click TC事件
  nowSelectTc = '';
  oldSelectTc = '';

  constructor(
    public dialog: MatDialog,
    private router: Router,
    private centerService: CenterService,
    private changeDetection: ChangeDetectorRef
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

    // TC可以偵測click事件
    this.centerService.canClickTC$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.canClickTC = res['canClick'];

        // 不在轉向量選單時，TC恢復原狀
        if(!this.canClickTC) {
          Object.values(this.tcGroup._layers).forEach((layer: any) => {
            if(layer._clicked) {
              layer.setIcon(L.icon({iconUrl: 'assets/icons/map_tc_selected.svg', iconSize: layer.options.icon.options.iconSize}));
              layer._clicked = false;
            }
          })
        }
      })
  }

  ngOnInit(): void {
    this.user = this.centerService.user_name;

    this.mapCenter = {
        latlng: L.latLng(25.0514376, 121.5353965), // 中心位置(嘉義)
        zoom: 14, // 預設zoom值
      };

    this.page = this.router.url; // 頁面設定

    // 訂閱主題
    this.centerService.theme$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((theme) => {
        this.theme = theme;
      });

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

    // 訂閱圖層開關
    this.centerService.mapControl$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.mapControlDisplay(res);
      })

    // 訂閱回傳資料
    this.centerService.statisticsData$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        // 清除框選紀錄
        this.cancelBtn();

        // 清除路段圖層
        if(typeof this.roadDrawGroup !== 'undefined') {
          this.roadDrawGroup.clearLayers();
        }

        // 設定所有時間範圍
        let hour_start = parseInt(res['time_period'][0].split(':')[0]);
        let hour_end = parseInt(res['time_period'][1].split(':')[0]);

        this.timeArr = [];
        for (let hours = hour_start; hours < hour_end; hours++) {
          for (let minutes = 0; minutes < 60; minutes += 15) {
            let formattedHours = (hours < 10 ? '0' : '') + hours;
            let formattedMinutes = (minutes === 0 ? '00' : minutes);
            this.timeArr.push(formattedHours + ':' + formattedMinutes);
          }
        }
        this.timeArr.push(hour_end.toString().padStart(2, '0') + ':00');

        this.data_type = res['data_type'];

        // 設定地圖路段資料
        this.sectionDataFormatted = this.sectionDataRestructuring(res);

        // 顯示時間軸
        this.showTimeLine = true;

        this.viewingTC = res['mainTC'];
        this.iconSetting();

        // 設定地圖的中心位置
        if(res['districtNew'].length === 1) {
          switch(res['districtNew'][0]) {
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
      });

    // 視窗點擊偵測
    document.getElementById('analyze_page_map').addEventListener('click', (e) => {
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
      if (typeof this.tcGroup !== 'undefined') {
        if (this.zoomLevel > 15) {
          Object.values(this.tcGroup._layers).forEach((layer: any) => {
            let newIcon = L.icon({ iconUrl: layer.options.icon.options.iconUrl, iconSize: [32, 33] });
            layer.setIcon(newIcon);
          })
        } else if (this.zoomLevel === 15) {
          Object.values(this.tcGroup._layers).forEach((layer: any) => {
            let newIcon = L.icon({ iconUrl: layer.options.icon.options.iconUrl, iconSize: [24, 24] });
            layer.setIcon(newIcon);
          })
        } else if (this.zoomLevel === 14) {
          Object.values(this.tcGroup._layers).forEach((layer: any) => {
            let newIcon = L.icon({ iconUrl: layer.options.icon.options.iconUrl, iconSize: [18, 18] });
            layer.setIcon(newIcon);
          })
        } else if (this.zoomLevel <= 13) {
          Object.values(this.tcGroup._layers).forEach((layer: any) => {
            let newIcon = L.icon({ iconUrl: layer.options.icon.options.iconUrl, iconSize: [11, 11] });
            layer.setIcon(newIcon);
          })
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
      have_upload: L.icon({
        iconUrl: 'assets/icons/map_tc_upload.png',
        iconSize: this.zoomLevel <= 13 ? [11, 11] : this.zoomLevel === 14 ? [18, 18] : this.zoomLevel === 15 ? [24, 24] : [32, 33]
      }),
      have_setting: L.icon({
        iconUrl: 'assets/icons/map_tc_setting.svg',
        iconSize: this.zoomLevel <= 13 ? [11, 11] : this.zoomLevel === 14 ? [18, 18] : this.zoomLevel === 15 ? [24, 24] : [32, 33]
      }),
      no_data: L.icon({
        iconUrl: 'assets/icons/map_tc_no.png',
        iconSize: this.zoomLevel <= 13 ? [11, 11] : this.zoomLevel === 14 ? [18, 18] : this.zoomLevel === 15 ? [24, 24] : [32, 33]
      }),
      have_selected: L.icon({
        iconUrl: 'assets/icons/map_tc_selected.svg',
        iconSize: this.zoomLevel <= 13 ? [11, 11] : this.zoomLevel === 14 ? [18, 18] : this.zoomLevel === 15 ? [24, 24] : [32, 33]
      }),
      click_selected: L.icon({
        iconUrl: 'assets/icons/map_tc_click.png',
        iconSize: this.zoomLevel <= 13 ? [11, 11] : this.zoomLevel === 14 ? [18, 18] : this.zoomLevel === 15 ? [24, 24] : [32, 33]
      }),
    }

    this.markerLayout(icon_type);
  }

  // 在地圖上呈現TC Marker
  markerLayout(icon_type) {
    // 清空原有的marker
    const layers = [];
    if (typeof this.tcGroup !== 'undefined') {
      this.tcGroup.clearLayers();
    }

    // 將資料marker呈現在地圖上
    this.positionData.forEach((e: any) => {
      // const { road, lat, lng, delay, volume, turning, tc_id } = e;

      let iconType;
      if (this.viewingTC.includes(e.tc_id)) {
        iconType = icon_type.have_selected;
      } else {
        if (e.turning) {
          iconType = icon_type.have_setting;
        } else if (e.volume || e.delay) {
          iconType = icon_type.have_upload;
        } else {
          iconType = icon_type.no_data;
        }
      }

      let layer: any = L.marker([e.lat, e.lng], {
        icon: iconType
      }).bindTooltip(`${e.tc_id} ${e.road}`, { offset: L.point({ x: 0, y: -20 }), direction: 'top' }).openTooltip()
      // 點選TC連動data-analyze
      .on('click', (event) => {
        if(this.canClickTC && event['target']['_status'] === 'setting_data') {
          this.centerService.clickTC$.next({
            select_tc_id: e.tc_id,
            select_road: e.road
          })

          this.oldSelectTc = this.nowSelectTc;
          this.nowSelectTc = `${e.tc_id} ${e.road}`;

          Object.values(this.tcGroup._layers).forEach((layer: any) => {
            // 點選的TC變換icon
            if(layer._tooltip._content === `${e.tc_id} ${e.road}`) {
              layer.setIcon(L.icon({iconUrl: 'assets/icons/map_tc_click.png', iconSize: layer.options.icon.options.iconSize}));
              layer._clicked = true;
            } else {
              // 舊的恢復原狀
              if(layer._tooltip._content === this.oldSelectTc) {
                layer.setIcon(L.icon({iconUrl: 'assets/icons/map_tc_selected.svg', iconSize: layer.options.icon.options.iconSize}));
                layer._clicked = false;
              }
            }
          })
        }
      });

      layer._status = e.turning ? 'setting_data' : (e.volume || e.delay) ? 'upload_data' : 'no_data';
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
      if(typeof tempSelect !== 'undefined') {
        tempSelect.remove();
      }
      if(typeof this.selectedScope !== 'undefined') {
        this.selectedScope.remove();
      }

      // 紀錄起始座標
      this.latlngs[0] = [e.latlng.lat, e.latlng.lng];

      // 繪製框選線條
      this.mapInstance.on('mousemove', (e: any) => {
        // 紀錄滑鼠經過的座標
        this.latlngs.push([e.latlng.lat, e.latlng.lng]);

        if(typeof tempSelect !== 'undefined') {
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
      console.log(e)
      if(e['show']) {
        const point = [e['lat'], e['lng']];
        if(this.isMarkerInsidePolygon(point, this.latlngs)) {
          selectData.push(e['tc_id'])
        }
      }
    })

    // 傳訊息給tc-select元件
    this.centerService.sendMapSelectResult$.next({
      mapSelectResult: selectData,
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
    if(typeof this.selectedScope !== 'undefined') {
      this.selectedScope.remove(); // 清除框選範圍
    }
  }

  // 圖層開關顯示設定
  mapControlDisplay(control) {
    // 橘色
    if (control.uploadStatus) {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if (layer['_status'] === 'upload_data') {
          this.mapInstance.addLayer(layer);
        }
      })
    } else {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if (layer['_status'] === 'upload_data') {
          this.mapInstance.removeLayer(layer);
        }
      })
    }

    // 綠色
    if (control.settingStatus) {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if (layer['_status'] === 'setting_data') {
          this.mapInstance.addLayer(layer);
        }
      })
    } else {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if (layer['_status'] === 'setting_data') {
          this.mapInstance.removeLayer(layer);
        }
      })
    }

    // 灰色
    if (control.nodataStatus) {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if (layer['_status'] === 'no_data') {
          this.mapInstance.addLayer(layer);
        }
      })
    } else {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if (layer['_status'] === 'no_data') {
          this.mapInstance.removeLayer(layer);
        }
      })
    }
  }

  // 地圖路段資料整理
  sectionDataRestructuring(sectionData) {
    const outputData = {};

    sectionData['mainTC'].forEach(item => {
      const tcId = item;
      if (!outputData[tcId]) {
        outputData[tcId] = {};
      }

      Object.entries(sectionData['allData'][tcId]['volume_data']).forEach(entry => { // 有錯(延滯五/六叉)
        const [key, value] = entry;
        if (key === 'total') { return; }

        if (!outputData[tcId][key]) {
          outputData[tcId][key] = {};
        }

        if (!outputData[tcId][key]['data']) {
          outputData[tcId][key]['data'] = {};
        }

        // 時段資料
        // 延滯假日不一樣(待調整)
        if (this.data_type === 'delay' && sectionData['weekday'] === '假日') {
          Object.entries(sectionData['allData'][tcId]['volume_data'][key]['data_holiday']).forEach(entry2 => {
            const [key2, value2] = entry2;
            if (this.isTimeInRanges(key2, sectionData['time_period'])) {
              if (!outputData[tcId][key]['data'][key2]) {
                outputData[tcId][key]['data'][key2] = value2;
              }
            }
          });
        } else {
          Object.entries(sectionData['allData'][tcId]['volume_data'][key]['data']).forEach(entry2 => {
            const [key2, value2] = entry2;
            if (this.isTimeInRanges(key2, sectionData['time_period'])) {

              if (!outputData[tcId][key]['data'][key2]) {
                outputData[tcId][key]['data'][key2] = value2;
              }
            }
          });
        }

        // 地點資料
        if (!outputData[tcId][key]['location']) {
          outputData[tcId][key]['location'] = sectionData['allData'][tcId]['volume_data'][key]['location'];
        }
      });
    });
    return outputData;
  }

  // 時間軸回傳資料
  getCurrentInd(event) {
    this.timeLineIdx = event;
    this.createPolyline(this.timeArr[this.timeLineIdx]);
    this.mapInstance.invalidateSize();
    this.changeDetection.detectChanges();
  }

  // 繪製路段polyline
  createPolyline(currentTime) {
    // 清除原圖層(避免跑時間軸不斷疊加資料)
    if(typeof this.roadDrawGroup !== 'undefined') {
      this.roadDrawGroup.clearLayers();
    }
    // 繪製新圖層
    let roadLayers = [];
    Object.entries(this.sectionDataFormatted).forEach(entry => {
      const [key, value] = entry;
      const tcId = key;
      Object.entries(this.sectionDataFormatted[tcId]).forEach(entry2 => {
        const [key2, value2] = entry2;

        if (value2['location'].length !== 0 && value2['location'] !== "N/A") {
          const lineStyleSetting = {};

          if (this.data_type == 'volume') {
            if (value2['data'][currentTime] <= 0.6) {
              lineStyleSetting['color'] = '#61A49D';
              lineStyleSetting['weight'] = 7;
            } else if (value2['data'][currentTime] <= 0.95 && value2['data'][currentTime] > 0.6) {
              lineStyleSetting['color'] = '#FFBE26';
              lineStyleSetting['weight'] = 7;
            } else if (value2['data'][currentTime] > 0.95) {
              lineStyleSetting['color'] = '#DE5A82';
              lineStyleSetting['weight'] = 7;
            } else {
              lineStyleSetting['color'] = '#808080';
              lineStyleSetting['weight'] = 7;
            }
          } else if (this.data_type == 'delay') {
            if (value2['data'][currentTime] <= 30) {
              lineStyleSetting['color'] = '#61A49D';
              lineStyleSetting['weight'] = 7;
            } else if (value2['data'][currentTime] <= 60 && value2['data'][currentTime] > 30) {
              lineStyleSetting['color'] = '#FFBE26';
              lineStyleSetting['weight'] = 7;
            } else if (value2['data'][currentTime] > 60) {
              lineStyleSetting['color'] = '#DE5A82';
              lineStyleSetting['weight'] = 7;
            } else {
              lineStyleSetting['color'] = '#808080';
              lineStyleSetting['weight'] = 7;
            }
          }

          let polylineRecord: any = L.polyline(value2['location'], lineStyleSetting);
          polylineRecord._id = `${tcId}-${key}`;
          roadLayers.push(polylineRecord);
        }
      });
    });

    this.roadDrawGroup = L.layerGroup(roadLayers);
    this.mapInstance.addLayer(this.roadDrawGroup); // 呈現在地圖上
  }

  // 檢查該時段是否在所選時間範圍內
  isTimeInRanges(time, range) {
    // 日期隨便設
    const timeValue = new Date(`2023-01-01T${time}`);
    let startTimeValue = new Date(`2023-01-01T${range[0]}`);
    let endTimeValue = new Date(`2023-01-01T${range[1]}`);
      if (timeValue >= startTimeValue && timeValue <= endTimeValue) {
        return true;
      }
    return false;
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
