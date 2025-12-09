import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { CenterService } from 'src/app/pages/center.service';
import { takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import "leaflet-rotatedmarker";

@Component({
  selector: 'app-map-small-card',
  templateUrl: './map-small-card.component.html',
  styleUrls: ['./map-small-card.component.scss']
})
export class MapSmallCardComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @Input() whichRoadId;
  @Input() positionData;
  @Input() allData;
  @Input() whichTime;

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
    zoomControl: false,
    doubleClickZoom: false, // 禁止地圖雙擊事件
    scrollWheelZoom: false,
    dragging: false,
  };
  // 地圖中心
  mapCenter = {
    latlng: L.latLng(24.804029, 120.957814), // 中心位置
    zoom: 18, // 預設zoom值
  };
  // 地圖設定
  theme: string;
  mapInstance: any;
  CurrentMapLayers = [];
  zoomLevel: number; // 偵測地圖zoom值

  // marker呈現相關設定
  tcGroup: any; // TC圖層

  // 箭頭繪製參數
  arrowGroup: any; // 箭頭圖層
  layers: any = [];
  arrowDataGroup = []; // 儲存turning_cfg資料，用於後續編輯過程，點選儲存時再更新回去

  cardTitle: string;
  filteredPositionData;
  data_type = 'volume';
  statusTest = false;

  // 定義所有路口類型
  allInterType = {
    three: ['上T型三叉路口', '下T型三叉路口', '左T型三叉路口', '右T型三叉路口'], // 先保留
    four: ['四叉路口', '正交四叉路口'],
    five: ['五叉路口'],
    six: ['六叉路口'],
  }

  constructor(
    private centerService: CenterService,
    private cdr: ChangeDetectorRef
  ) {
    this.centerService.clickTC$
    .pipe(takeUntil(this.destroyed$))
    .subscribe(res => {
      if(res['select_tc_id'] === this.whichRoadId) {
        this.statusTest = true;
        this.cdr.detectChanges(); // 強制偵測變化
      } else {
        this.statusTest = false;
        this.cdr.detectChanges(); // 強制偵測變化
      }
    })
  }

  ngOnInit(): void {
    // 切換主題
    this.centerService.theme$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((theme) => {
        this.theme = theme;
      });
  }

  selectTC(title) {
    this.statusTest = true;
    this.centerService.clickTC$.next({
      select_road: title
    })
  }

  selectChange() {
    if(this.statusTest) {
      return 'select';
    } else {
      return 'org';
    }
  }

  onMapReady(map: any) {
    this.mapInstance = map;
    // 宣告 promise 建構式
    const afterMapReady = new Promise<void>((resolve, reject) => {
      if (this.mapInstance !== undefined) {
        resolve();
      } else {
        reject();
      }
    });
  }

  // 設定icon(不同zoom值)
  iconSetting() {
    // icon種類設定
    let icon_type = {};
    icon_type['upload_data'] = L.icon({ iconUrl: 'assets/icons/map_tc_upload.png', iconSize: [32, 33] });
    icon_type['setting_data'] = L.icon({ iconUrl: 'assets/icons/map_tc_setting.svg', iconSize: [32, 33] });
    icon_type['no_data'] = L.icon({ iconUrl: 'assets/icons/map_tc_no.png', iconSize: [32, 33] });
    this.markerLayout(icon_type);
  }

  // 在地圖上呈現TC Marker
  markerLayout(icon_type) {
    // 清空原有的marker(否則之前的marker會一直留著)
    const layers = [];
    if (typeof this.tcGroup !== 'undefined') {
      this.tcGroup.clearLayers();
    }

    // 將取得的經緯度資料做成marker呈現在地圖上
    const { road, lat, lng, delay, volume, turning, tc_id } = this.filteredPositionData;

    let iconParameter;
    if (!(this.data_type === 'volume' ? volume : delay)) {
      iconParameter = icon_type.no_data;
    } else {
      if (turning) {
        iconParameter = icon_type.setting_data;
      } else {
        iconParameter = icon_type.upload_data;
      }
    }

    let layer: any = L.marker([lat, lng], {
      icon: iconParameter
    }).bindTooltip(`${tc_id} ${road}`, { offset: L.point({ x: 0, y: -20 }), direction: 'top' }).openTooltip()

    layer._status = this.filteredPositionData.turning ? 'setting_data' : (this.filteredPositionData.volume) ? 'upload_data' : 'no_data'
    layers.push(layer); // 將所有產生的marker加到layers

    this.tcGroup = L.layerGroup(layers);

    // ============================================================================================
    // 清除之前的箭頭與其資料
    this.layers.forEach(layer => {
      this.mapInstance.removeLayer(layer);
    });
    this.layers = [];

    // 直接用傳過來的資料
    const turning_config_data = this.allData['allData'][this.whichRoadId]['turning_config_data']

    let intersectionType = turning_config_data['intersection_type'];
    let roadGroups = turning_config_data['road_groups'];
    let turningConfig = [];

    if ([...this.allInterType['four'], ...this.allInterType['five'], ...this.allInterType['six']].includes(intersectionType)) {
      turningConfig = turning_config_data['turning_config'];
    } else if (this.allInterType['three'].includes(intersectionType)) {
      let originTurningConfig = turning_config_data['turning_config'];
      let allDirection = ['A', 'B', 'C', 'D'];
      let directionArr = originTurningConfig.map((e) => e['marker_dir']);
      let no_dir = allDirection.filter(e => !directionArr.includes(e))[0];

      originTurningConfig = originTurningConfig.map((e) => {
        let nowDirArr = e['arrow_setting'].map(el => el['direction_name']);
        let dir_index = nowDirArr.findIndex(e => e === no_dir); // dir_index為-1待表示初次編輯
        if (dir_index !== -1) {
          e['arrow_setting'] = e['arrow_setting'].filter(el => el['direction_name'] !== no_dir);
        }
        return e;
      })
      turningConfig = originTurningConfig;
    }

    setTimeout(() => {
      this.mapInstance.addLayer(this.tcGroup);
      this.createArrowMarker(this.whichRoadId, this.whichRoadId, roadGroups, intersectionType, turningConfig);
    }, 100)
  }

  // 產生箭頭marker
  createArrowMarker(tc_id, roadName, roadGroups, intersecionType, turningConfig) {
    // 依照有多少筆資料就產生多少組箭頭
    turningConfig.forEach((e, arrowIndex) => {
      let eachRoad = e['each_road']; // 各路段名稱
      let markerDir = e['marker_dir']; // 各箭頭代表方向
      let lat = e['origin_position'][0];
      let lng = e['origin_position'][1];
      let setLat = lat;
      let setLng = lng;

      // 取得後端的箭頭設定
      let arrowSetting = e['arrow_setting'];

      // 依照有幾個轉向產生幾個marker
      arrowSetting.forEach((el, markerIdx) => {
        // console.log(el);
        let directionName = el['direction_name']; // 各轉向代號
        let angle = 0; // 旋轉角度
        let arrowType = el['select_arrow_type']; // 選擇的箭頭方向

        if([...this.allInterType['three'], ...this.allInterType['four']].includes(intersecionType)) {
          angle = el['angle'] < 0 ? el['angle'] + 360 : el['angle'];
        } else if([...this.allInterType['five']].includes(intersecionType)) {
          let type_five_org = [0, 72, -72, 144, 216];
          angle = type_five_org.includes(el['angle']) ? 0 : el['angle'] < 0 ? el['angle'] + 360 : el['angle']; // 旋轉角度(待調整)
        } else if([...this.allInterType['six']].includes(intersecionType)) {
          console.log(el['angle'])
          let type_six_org = [0, 60, 120, 180, 240 , -60];
          angle = type_six_org.includes(el['angle']) ? 0 : el['angle'] < 0 ? el['angle'] + 360 : el['angle']; // 旋轉角度(待調整)
        }

        lat = el['position'][0];
        lng = el['position'][1];
        setLat = lat;
        setLng = lng;

        let turning_value;
        if (typeof this.allData['allData'][tc_id]['turning_data'][markerDir][directionName] === 'undefined') {
          turning_value = NaN;
        } else {
          turning_value = Math.round(this.allData['allData'][tc_id]['turning_data'][markerDir][directionName][this.whichTime]);
        }

        // 箭頭icon設定
        let icon = L.divIcon({
          html: this.svgGenerator('general', arrowType, markerDir, turning_value) + this.numberGenerator(arrowType, turning_value, angle),
          className: "svg-icon",
          iconAnchor: arrowType === '直行' ? [14.5, 66.55] : arrowType === '右轉' ? [10, 20] : [54, 20]
        })

        // 箭頭marker設定
        let layer: any = L.marker([setLat, setLng], { icon: icon, rotationAngle: angle })

        layer._id = `${tc_id}-${markerDir}-${directionName}`;
        layer._markerDir = markerDir;
        layer._arrowType = arrowType;
        layer._directionName = directionName;
        el['id'] = layer._id;
        el['position'] = [setLat, setLng];
        this.layers.push(layer);
      })

      // 儲存該路口所有方向的資訊(將turning_cfg資料存入arrowDataGroup以利後續編輯)
      this.arrowDataGroup.push({
        eachRoad: eachRoad, // 各路段名稱
        markerDir: markerDir, // 各箭頭代表方向
        originPosition: [lat, lng],
        arrowSetting: arrowSetting
      })
    })
    this.arrowGroup = L.layerGroup(this.layers);
    this.mapInstance.addLayer(this.arrowGroup); // 呈現在地圖上
  }

  // 創建SVG元素
  svgGenerator(type, arrowType, markerDir, directionName) {
    let svgContainer = document.createElement('div');
    if (arrowType === '直行') {
      svgContainer.innerHTML = this.arrowFront;
    } else if (arrowType === '右轉') {
      svgContainer.innerHTML = this.arrowRight;
    } else if (arrowType === '左轉') {
      svgContainer.innerHTML = this.arrowLeft;
    }

    let resSVG = svgContainer.innerHTML;
    return resSVG;
  }

  numberGenerator(arrowType, turning_value, angle) {
    let numberHtml

    if (arrowType === '直行') {
      numberHtml = '<span class="my-div-span-straight" style="transform: rotate(' + (360 - angle) + 'deg)">' + turning_value + '</span>';
    } else if (arrowType === '右轉') {
      numberHtml = '<span class="my-div-span-right" style="transform: rotate(' + (360 - angle) + 'deg)">' + turning_value + '</span>';
    } else if (arrowType === '左轉') {
      numberHtml = '<span class="my-div-span-left" style="transform: rotate(' + (360 - angle) + 'deg)">' + turning_value + '</span>';
    }
    return numberHtml;
  }

  changePosition(whichDirection) {
    this.centerService.tcSmallCardChangePosition$.next({
      "whichDirection": whichDirection,
      "tc_id": this.whichRoadId,
    })
  }

  ngOnChanges() {
    this.filteredPositionData = this.positionData.filter(item => item.tc_id === this.whichRoadId)[0];
    this.mapCenter.latlng = L.latLng(this.filteredPositionData.lat, this.filteredPositionData.lng);
    this.cardTitle = this.filteredPositionData.road;
    this.iconSetting();
  }

  // 直行
  arrowFront = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="30" height="127" viewBox="0 0 44.171 191">
  <g id="arrow" data-name="arrow" transform="translate(-579.918 -638)">
    <path id="path" data-name="path" d="M607.406,887.057,585.323,863.3l-22.088,23.752,3.956,3.684,14.269-15.35v98.523h7.717V875.381L603.45,890.74Z" transform="translate(16.683 -185.304)" fill="#2dbdd5"/>
    <g id="volume_group" data-name="volume_group" transform="translate(1347 140) rotate(90)">
      <g id="volume_1" data-name="volume_1" transform="translate(573 762.5)" style="mix-blend-mode: normal;isolation: isolate">
        <text id="outText" data-name="outText" transform="translate(-26 -11.5)" fill="#000" stroke="#000" stroke-width="2" font-size="30" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC" style="mix-blend-mode: normal;isolation: isolate"><tspan x="0" y="0"></tspan></text>
      </g>
      <g id="volume_2" data-name="volume_2" transform="translate(573 762.5)" style="mix-blend-mode: normal;isolation: isolate">
        <g transform="matrix(0, -1, 1, 0, -75, 4.58)" style="mix-blend-mode: normal;isolation: isolate">
          <text id="inText" data-name="inText" transform="translate(16.08 49) rotate(90)" fill="#000" font-size="30" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC"><tspan x="0" y="0"></tspan></text>
        </g>
      </g>
    </g>
  </g>
</svg>`

  // 右轉
  arrowRight = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64" height="80" viewBox="0 0 97.324 121.407">
  <g id="arrow" data-name="arrow" transform="translate(-593.676 -707.593)">
    <path id="path" data-name="path" d="M608.943,870.526l-3.683,3.955,15.349,14.269h-9.238a43.836,43.836,0,0,0-43.782,43.786v18.37h7.718v-18.37a36.1,36.1,0,0,1,36.063-36.067h9.25L605.26,910.741l3.683,3.955L632.7,892.614Z" transform="translate(30.554 -162.104)" fill="#2dbdd5"/>
    <g id="volume_group" data-name="volume_group" transform="matrix(0.914, -0.407, 0.407, 0.914, -194.764, 288.666)">
      <g id="volume_1" data-name="volume_1" transform="translate(573 762.5)" style="mix-blend-mode: normal;isolation: isolate">
        <text id="outText" data-name="outText" transform="translate(-26 -11.5)" fill="#000" stroke="#000" stroke-width="2" font-size="30" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC" style="mix-blend-mode: normal;isolation: isolate"><tspan x="0" y="0"></tspan></text>
      </g>
      <g id="volume_2" data-name="volume_2" transform="translate(573 762.5)" style="mix-blend-mode: normal;isolation: isolate">
        <g transform="matrix(0.91, 0.41, -0.41, 0.91, 5.19, -122.68)" style="mix-blend-mode: normal;isolation: isolate">
          <text id="inText" data-name="inText" transform="matrix(0.91, -0.41, 0.41, 0.91, 16.73, 114.25)" fill="#000" font-size="30" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC"><tspan x="0" y="0"></tspan></text>
        </g>
      </g>
    </g>
  </g>
</svg>`

  // 左轉
  arrowLeft = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64" height="80" viewBox="0 0 98.244 121">
  <g id="arrow" data-name="arrow" transform="translate(-513 -708)">
    <path id="path" data-name="path" d="M575.2,888.753h-9.246l15.357-14.273-3.683-3.955-23.753,22.083L577.63,914.7l3.683-3.955-15.349-14.269H575.2a36.108,36.108,0,0,1,36.067,36.067V950.91h7.718V932.539A43.836,43.836,0,0,0,575.2,888.753Z" transform="translate(-12.877 -162.107)" fill="#2dbdd5"/>
    <g id="volume_group" data-name="volume_group" transform="matrix(0.914, 0.407, -0.407, 0.914, 561.135, 717)">
      <g id="volume_1" data-name="volume_1" transform="translate(0 0)" style="mix-blend-mode: normal;isolation: isolate">
        <text id="outText" data-name="outText" transform="translate(0 19)" fill="#000" stroke="#000" stroke-width="2" font-size="30" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC" style="mix-blend-mode: normal;isolation: isolate"><tspan x="0" y="0"></tspan></text>
      </g>
      <g id="volume_2" data-name="volume_2" transform="translate(0 0)" style="mix-blend-mode: normal;isolation: isolate">
        <g transform="matrix(0.91, -0.41, 0.41, 0.91, -76.11, -52.59)" style="mix-blend-mode: normal;isolation: isolate">
          <text id="inText" data-name="inText" transform="matrix(0.91, 0.41, -0.41, 0.91, 40.41, 96.36)" fill="#000" font-size="30" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC"><tspan x="0" y="0"></tspan></text>
        </g>
      </g>
    </g>
  </g>
</svg>`
}
