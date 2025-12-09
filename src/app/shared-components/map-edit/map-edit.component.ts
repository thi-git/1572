import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { CenterService } from '../../pages/center.service';
import { AuthService } from 'src/app/pages/auth/services';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import "leaflet-rotatedmarker";

@Component({
  selector: 'app-map-edit',
  templateUrl: './map-edit.component.html',
  styleUrls: ['./map-edit.component.scss']
})
export class MapEditComponent implements OnInit, OnDestroy {
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
    doubleClickZoom: false // 禁止地圖雙擊事件
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

  // 儲存filter條件
  main_tc = [];
  district_new = [];

  selectStep: string = '';
  openEdit: boolean = false;

  // TC marker相關設定
  tcGroup: any; // TC圖層(路口定義)
  tcGroupOther: any; // TC圖層(路段繪製)
  positionData: any = []; // 顯示所選TC資料(路口定義)
  positionDataOther: any = []; // 顯示所有TC資料

  // 箭頭繪製參數
  arrowLayers: any = []; // 箭頭圖層
  selectedMarker: any; // 記錄當下正在編輯的箭頭marker
  selectedMarkerBtn: any; // 記錄當下正在編輯的箭頭工具marker
  arrowDataGroup = []; // 儲存turning_cfg資料

  // 路段繪製參數
  roadLayers: any = []; // 路段圖層
  circleLayers: any = []; // 圓點圖層
  triangleLayers: any = []; // 三角形箭頭圖層

  roadSectionGroup = []; // 該路口的所有路段繪製資料
  roadSectionGroupSave = []; // 儲存最初始資訊
  selectedRoadData = {}; // 當下選到要編輯的路段繪製資料
  allPolyline = []; // 該路口的所有polyline紀錄
  selectedPolyline; // 當下選到要編輯的polyline紀錄
  nowPolyline; // 當下選到要編輯polyline內容

  clickLatlngRecord = []; // 記錄click過的經緯度
  countIdx = 0; // 計算每個circle的index
  tempPolylineLayers = []; // 畫線時引線圖層
  isEditing: boolean = false; // 判段路段是否在編輯中
  isFirstEdit: boolean = true; // 判斷是畫新polyline還是修改已存在polyline
  tempLatlng;
  tempId;

  // 定義所有路口類型
  allInterType = {
    three: ['上T型三叉路口', '下T型三叉路口', '左T型三叉路口', '右T型三叉路口'], // 先保留
    four: ['四叉路口', '正交四叉路口'],
    five: ['五叉路口'],
    six: ['六叉路口'],
  }

  intersectionType = '';
  testRoadGroup = []; // 顯示路口示意圖

  constructor(
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private centerService: CenterService,
    private authService: AuthService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    // 回到路口選擇頁面
    this.centerService.backToStart$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.flyto([25.0514376, 121.5353965], 14);
        this.mapInstance.scrollWheelZoom.enable();
        this.centerService.tc_id = '';

        // 清除箭頭圖層與資料
        this.arrowLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.arrowLayers = [];

        // 清除路段相關圖層與資料
        this.roadLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.circleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.triangleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.roadLayers = [];
        this.circleLayers = [];
        this.triangleLayers = [];

        this.selectedMarker = undefined;
        this.selectedMarkerBtn = undefined;
      })

    // 切頁防呆判斷
    this.centerService.isEditing$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res['step'] !== 'drawing') {
          // 若沒有完成編輯狀態 => 自動存好該條路段資料
          if(this.isEditing) {
            this.tempFinishDrawing();
          }
          if(JSON.stringify(this.roadSectionGroup) !== JSON.stringify(this.roadSectionGroupSave)) {
            this.centerService.isEditing = true;
            this.remind('請先儲存或取消編輯內容', 'red', false);
          }
        }
      })

    // 編輯步驟選擇
    this.centerService.editSelect$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((res) => {
      this.selectStep = res['selectEditStep'];

      // 先將路段資料清除，避免切頁過快時防呆有誤
      this.roadSectionGroup.length = 0;
      this.roadSectionGroupSave.length = 0;

      if(this.selectStep === 'select') {
        // 清空不在選單上的marker
        if(typeof this.tcGroupOther !== 'undefined') {
          this.tcGroupOther.clearLayers();
        }
        // 隱藏箭頭圖層
        this.arrowLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        // 隱藏路段相關圖層&刪除資料
        this.roadLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.circleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.triangleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.roadLayers = [];
        this.circleLayers = [];
        this.triangleLayers = [];
      } if(this.selectStep === 'definition') {
        // 清空不在選單上的marker
        if(typeof this.tcGroupOther !== 'undefined') {
          this.tcGroupOther.clearLayers();
        }
        // 顯示箭頭圖層
        this.arrowLayers.forEach(layer => {
          this.mapInstance.addLayer(layer);
        });
        // 隱藏路段相關圖層&刪除資料
        this.roadLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.circleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.triangleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.roadLayers = [];
        this.circleLayers = [];
        this.triangleLayers = [];
        // 如果從其他頁面回來，就要重新針對路口定義頁面做設定
        if(res['previousEditStep'] === 'drawing' || res['previousEditStep'] === 'params') {
          this.mapInstance.scrollWheelZoom.disable();
          this.mapInstance.getContainer().style.cursor = 'grab';
          this.flyto([this.centerService.markerLatLng[0] + 0.00028, this.centerService.markerLatLng[1] + 0.0016], 18); // 位置偏左
        }
      } else if(this.selectStep === 'params') {
        // 隱藏箭頭圖層
        this.arrowLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        // 隱藏路段相關圖層&刪除資料
        this.roadLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.circleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.triangleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.roadLayers = [];
        this.circleLayers = [];
        this.triangleLayers = [];
      } else if(this.selectStep === 'drawing') {
        // 顯示不在選單上的marker
        this.iconSetting();
        // 隱藏箭頭圖層
        this.arrowLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        // 顯示路段相關圖層
        this.roadLayers.forEach(layer => {
          this.mapInstance.addLayer(layer);
        });
        this.circleLayers.forEach(layer => {
          this.mapInstance.addLayer(layer);
        });
        this.triangleLayers.forEach(layer => {
          this.mapInstance.addLayer(layer);
        });
        this.mapInstance.scrollWheelZoom.enable();
        this.flyto([this.centerService.markerLatLng[0] + 0.00028, this.centerService.markerLatLng[1]], 18);
        this.getRoadDrawingData(); // 取得路段繪製頁面資料
      }
    })

    // 檢查是否需要更改icon顏色
    this.centerService.changeTCIcon$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((res) => {
      this.centerService.get('/api/turning/status').subscribe({
        next: (back) => {
          let iconStatus = back['data'].filter(e => e['tc_id'] === this.centerService.tc_id)[0]['turning'];
          let selectedTC: any = Object.values(this.tcGroup._layers).filter(e => e['_id'] === this.centerService.tc_id)[0];
          // 修改icon顏色
          if(iconStatus) {
            selectedTC._status = 'setting_data';
            selectedTC.setIcon(L.icon({iconUrl: 'assets/icons/map_tc_setting.svg', iconSize: selectedTC.options.icon.options.iconSize}));
          } else {
            selectedTC._status = 'upload_data';
            selectedTC.setIcon(L.icon({iconUrl: 'assets/icons/map_tc_upload.png', iconSize: selectedTC.options.icon.options.iconSize}));
          }
          // 修改原始資料狀態
          this.positionData = this.positionData.map(e => {
            if(e['tc_id'] === this.centerService.tc_id) {
              e['turning'] === iconStatus;
            }
            return e;
          })
        },
        error: (err) => {
          console.log(err);
          if (err.error.msg === 'Token has expired') {
            this.authService.signOut(); // token過期登出
          }
        }
      });
    })

    // 選擇編輯路段(利用id尋找marker)
    this.centerService.selectedRoadMarker$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        // 新箭頭設定 => 開始編輯，更改顏色
        res['data']['arrowSetting'].forEach((e) => {
          let arrow = this.getMarkerById(e['id'])[0];
          let redIcon = L.divIcon({
            html: this.svgGenerator('edit', e['select_arrow_type'], res['data']['markerDir'], e['direction_name']),
            className: "svg-icon",
            iconAnchor: e['select_arrow_type'] === '直行' ? [14.5, 66.55] : e['select_arrow_type'] === '右轉' ? [10, 20] : [54, 20]
          });
          arrow.setIcon(redIcon);
          arrow.dragging.enable();
          arrow.setZIndexOffset(1000); // 點選到的marker設定在最上層
        })

        // 舊箭頭設定 => 結束編輯，回復顏色
        if(Object.keys(res['previous']).length !== 0) {
          res['previous']['arrowSetting'].forEach((e) => {
            let oldArrow = this.getMarkerById(e['id'])[0];
            let oldArrowBtn = this.getMarkerById(e['id'])[1];
            let blackIcon = L.divIcon({
              html: this.svgGenerator('general', e['select_arrow_type'], res['previous']['markerDir'], e['direction_name']),
              className: "svg-icon",
              iconAnchor: e['select_arrow_type'] === '直行' ? [14.5, 66.55] : e['select_arrow_type'] === '右轉' ? [10, 20] : [54, 20]
            });
            oldArrow.setIcon(blackIcon);
            oldArrow.dragging.disable();
            oldArrow.setZIndexOffset(400); // 設定較低index
            oldArrowBtn.getElement().querySelector('.util-icon').style.display = 'none'; // 隱藏舊按鈕
          })
        }
      })

    // 選擇箭頭轉向
    this.centerService.selectedArrowDirection$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.selectedMarkerSetting(res['selectedId']); // 指定當前marker&設定工具btn
        let selectedIcon = L.divIcon({
          html: this.svgGenerator('edit', res['selectedTypeName'], res['markerDir'], res['selectedDirectionName']),
          className: "svg-icon",
          iconAnchor: res['selectedTypeName'] === '直行' ? [14.5, 66.55] : res['selectedTypeName'] === '右轉' ? [10, 20] : [54, 20]
        });
        this.selectedMarker.setIcon(selectedIcon);

        let RotationOriginSetting = res['selectedTypeName'] === '直行' ? [14.5, 66.55] : res['selectedTypeName'] === '右轉' ? [10, 20] : [54, 20];
        this.selectedMarker.setRotationOrigin(`${RotationOriginSetting[0]}px ${RotationOriginSetting[1]}px`);

        // 如果隱藏箭頭，對應的工具btn也要隱藏
        if(res['selectedTypeName'] === '無') {
          this.selectedMarkerBtn.getElement().querySelector('.util-icon').style.display = 'none';
          this.selectedMarkerBtn.setZIndexOffset(100); // 工具不顯示時index下移
        }
      })

    // 點選儲存/取消後更改marker樣式 (待調整)
    this.centerService.afterSaveOrCancel$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        res['arrowSetting'].forEach((e) => {
          let arrow = this.getMarkerById(e['id'])[0];
          let arrowBtn = this.getMarkerById(e['id'])[1];
          let selectedIcon = L.divIcon({
            html: this.svgGenerator('general', e['select_arrow_type'], res['markerDir'], e['direction_name']),
            className: "svg-icon",
            iconAnchor: e['select_arrow_type'] === '直行' ? [14.5, 66.55] : e['select_arrow_type'] === '右轉' ? [10, 20] : [54, 20]
          });
          arrow.setIcon(selectedIcon);
          arrow.dragging.disable();
          arrow.setZIndexOffset(400); // 設定較低index
          arrowBtn.getElement().querySelector('.util-icon').style.display = 'none'; // 隱藏舊按鈕
        })

        // 結束編輯後，恢復最原始設定
        this.selectedMarker = undefined;
        this.selectedMarkerBtn = undefined;
      })

    // 結束編輯後回復地圖預設&清除箭頭
    this.centerService.editStatus$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.openEdit = res['openEdit'];
      })

    // 路口定義頁面取消編輯後顯示原資料(待調整)
    this.centerService.getOldData$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
          // 清除之前的箭頭圖層與資料
          this.arrowLayers.forEach(layer => {
            this.mapInstance.removeLayer(layer);
          });
          this.arrowLayers = [];
          this.arrowDataGroup.length = 0; // 清空之前的路口資料

          // 待調整(防止切頁防呆後取消結果內容未清空)
          this.selectedMarker = undefined;
          this.selectedMarkerBtn = undefined;

          // 再次取得路口定義資料並呈現原資料箭頭
          this.centerService.get(`/api/turning/search/svg_detail/${this.centerService.tc_id}`).subscribe({
            next: (res) => {
              let intersectionType = res['data']['intersection_type'];
              let roadGroups = res['data']['road_groups'];
              let turningConfig = [];

              // 四叉/五叉/六叉不用處理，三叉由四叉資料修正而來(依照資料回傳的筆數判定路口類型)
              if(res['data']['turning_config'].length !== 3) {
                turningConfig = res['data']['turning_config'];
              } else {
                let originTurningConfig = res['data']['turning_config'];
                let allDirection = ['A', 'B', 'C', 'D'];
                let directionArr = originTurningConfig.map((e) => e['marker_dir']);
                let no_dir = allDirection.filter(e => !directionArr.includes(e))[0];

                originTurningConfig = originTurningConfig.map((e) => {
                  let nowDirArr = e['arrow_setting'].map(el => el['direction_name']);
                  let dir_index = nowDirArr.findIndex(e => e === no_dir); // dir_index不是-1代表初次編輯(需進行轉換)
                  if(dir_index !== -1) {
                    e['arrow_setting'] = e['arrow_setting'].filter(el => el['direction_name'] !== no_dir);
                  }
                  return e;
                })
                turningConfig = originTurningConfig;
              }

              this.createArrowMarker(this.centerService.tc_id, res['data']['road'], intersectionType, roadGroups, turningConfig, res['data']['city']);
            },
            error: (err) => {
              console.log(err);
              if(err.error.msg === 'Token has expired') {
                this.authService.signOut(); // token過期登出
              }
            }
          })
      })

    // 傳送選擇到的路段資料
    this.centerService.sendSelectedRoad$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        // 選擇某路段後，沒有點選完成就選下一條不相同路段(狀態停留在編輯中) => 自動存好前一條路段資料再執行下一條路段編輯
        if(this.isEditing) {
          this.tempFinishDrawing();
        }
        this.isEditing = true;
        this.selectedRoadData = res['selectedData']; // 當下選擇的路段資料
        this.selectedPolyline = this.allPolyline.filter((el => el['id'] === this.selectedRoadData['id']))[0]; // 當下選擇的polyline資料
        this.nowPolyline = this.selectedPolyline['status'];

        // 進入編輯就清除該條路段的箭頭圖層與資料
        this.triangleLayers.forEach(layer => {
          if(layer._id === this.selectedPolyline['id']) {
            this.mapInstance.removeLayer(layer);
          }
        })
        this.triangleLayers = this.triangleLayers.filter(e => e._id !== this.selectedPolyline['id']);
        this.createOrEditPolyline(); // 觸發繪圖function
      })

    // 路段儲存/取消
    this.centerService.saveResult$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res['editStep'] === 'drawing') {
          this.saveOrCancelRes(res['status']);
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

    // 訂閱搜尋按鈕
    this.centerService.clickSearch$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((res)=>{
      this.main_tc = res['mainTC'];
      this.district_new = res['districtNew']
      this.getData();
    })

    // 訂閱圖層開關
    this.centerService.mapControl$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((res)=>{
      this.mapControlDisplay(res);
    })

    // 視窗點擊偵測
    document.getElementById('edit_page_map').addEventListener('click', (e)=>{
      this.centerService.windowClick$.next(true);
    })
  }

  // 產生箭頭marker
  createArrowMarker(tc_id, roadName, intersectionType, roadGroups, turningConfig, city) {
    this.mapInstance.dragging.enable(); // 到定點後可拖曳地圖
    this.centerService.isMoving = false;

    // 依照有多少筆資料就產生多少組箭頭
    turningConfig.forEach((e) => {
      let eachRoad = e['each_road']; // 各路段名稱
      let markerDir = e['marker_dir']; // 各箭頭代表方向
      let originLat = e['origin_position'][0];
      let originLng = e['origin_position'][1];
      let setLat = originLat;
      let setLng = originLng;
      let arrowSetting = e['arrow_setting'];

      // 依照有幾個轉向產生幾個箭頭
      arrowSetting.forEach((el) => {
        let directionName = el['direction_name']; // 各轉向代號
        let angle = 0; // 旋轉角度
        let arrowType = el['select_arrow_type']; // 選擇的箭頭類型
        let utilLat, utilLng; // 工具位置

        // 依照路口類型作設定
        if([...this.allInterType['three'], ...this.allInterType['four']].includes(intersectionType)) {
          // 三叉/四叉位置調整
          if(el['position'].length === 0) {
            angle = el['angle'] < 0 ? el['angle'] + 360 : el['angle'];
            if(markerDir === 'A' ) {
              if(el['type'] === '直行') {
                setLat = originLat + 0.0000005;
                setLng = originLng + 0.000350;
              } if(el['type'] === '右轉') {
                setLat = originLat + 0.000090;
                setLng = originLng + 0.000350;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000085;
                setLng = originLng + 0.000350;
              }
            } else if(markerDir === 'B') {
              if(el['type'] === '直行') {
                setLat = originLat - 0.000045;
                setLng = originLng + 0.000001;
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045;
                setLng = originLng + 0.000095;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045;
                setLng = originLng - 0.000095;
              }
            } else if(markerDir === 'C') {
              if(el['type'] === '直行') {
                setLat = originLat - 0.000001;
                setLng = originLng - 0.000350;
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000085;
                setLng = originLng - 0.000350;
              } else if(el['type'] === '左轉') {
                setLat = originLat + 0.000090;
                setLng = originLng - 0.000350;
              }
            } else if(markerDir === 'D') {
              if(el['type'] === '直行') {
                setLat = originLat + 0.000045;
                setLng = originLng + 0.000001;
              } else if(el['type'] === '右轉') {
                setLat = originLat + 0.000045;
                setLng = originLng - 0.000095;
              } else if(el['type'] === '左轉') {
                setLat = originLat + 0.000045;
                setLng = originLng + 0.000095;
              }
            }
          } else {
            angle = el['angle'] < 0 ? el['angle'] + 360 : el['angle'];
            originLat = el['position'][0];
            originLng = el['position'][1];
            setLat = originLat;
            setLng = originLng;
          }
        } else if([...this.allInterType['five']].includes(intersectionType)) {
          // 五叉位置調整
          if(el['position'].length === 0) {
            angle = 0;
            if(markerDir === 'A' ) {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045 - 0.0001;
                  setLng = originLng - 0.000041 + 0.0003;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045 - 0.0001;
                  setLng = originLng + 0.000041 + 0.0003;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045 - 0.0001;
                setLng = originLng + 0.000135 + 0.0003;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045 - 0.0001;
                setLng = originLng - 0.000135 + 0.0003;
              }
            } else if(markerDir === 'B') {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045;
                  setLng = originLng - 0.000041;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045;
                  setLng = originLng + 0.000041;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045;
                setLng = originLng + 0.000135;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045;
                setLng = originLng - 0.000135;
              }
            } else if(markerDir === 'C') {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045 - 0.0001;
                  setLng = originLng - 0.000041 - 0.0003;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045 - 0.0001;
                  setLng = originLng + 0.000041 - 0.0003;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045 - 0.0001;
                setLng = originLng + 0.000135 - 0.0003;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045 - 0.0001;
                setLng = originLng - 0.000135 - 0.0003;
              }
            } else if(markerDir === 'D') {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045 + 0.0001;
                  setLng = originLng - 0.000041 - 0.00025;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045 + 0.0001;
                  setLng = originLng + 0.000041 - 0.00025;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045 + 0.0001;
                setLng = originLng + 0.000135 - 0.00025;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045 + 0.0001;
                setLng = originLng - 0.000135 - 0.00025;
              }
            } else if(markerDir === 'E' ) {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045 + 0.0001;
                  setLng = originLng - 0.000041 + 0.00025;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045 + 0.0001;
                  setLng = originLng + 0.000041 + 0.00025;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045 + 0.0001;
                setLng = originLng + 0.000135 + 0.00025;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045 + 0.0001;
                setLng = originLng - 0.000135 + 0.00025;
              }
            }
          } else {
            angle = [0, 72, -72, 144, 216].includes(el['angle']) ? 0 : el['angle'] < 0 ? el['angle'] + 360 : el['angle'];
            originLat = el['position'][0];
            originLng = el['position'][1];
            setLat = originLat;
            setLng = originLng;
          }
        } else if([...this.allInterType['six']].includes(intersectionType)) {
          // 六叉位置調整
          if(el['position'].length === 0) {
            angle = 0
            if(markerDir === 'A' ) {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045;
                  setLng = originLng - 0.000095 + 0.00024;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045;
                  setLng = originLng + 0.00024
                } else if(el['front_order'] === 3) {
                  setLat = originLat - 0.000045;
                  setLng = originLng + 0.000095 + 0.00024;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045;
                setLng = originLng + 0.000205 + 0.00024;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045;
                setLng = originLng - 0.000205 + 0.00024;
              }
            } else if(markerDir === 'B') {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045;
                  setLng = originLng - 0.000095;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045;
                  setLng = originLng
                } else if(el['front_order'] === 3) {
                  setLat = originLat - 0.000045;
                  setLng = originLng + 0.000095;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045;
                setLng = originLng + 0.000205;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045;
                setLng = originLng - 0.000205;
              }
            } else if(markerDir === 'C') {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045;
                  setLng = originLng - 0.000095 - 0.00024;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045;
                  setLng = originLng - 0.00024
                } else if(el['front_order'] === 3) {
                  setLat = originLat - 0.000045;
                  setLng = originLng + 0.000095 - 0.00024;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045;
                setLng = originLng + 0.000205 - 0.00024;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045;
                setLng = originLng - 0.000205 - 0.00024;
              }
            } else if(markerDir === 'D') {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045;
                  setLng = originLng - 0.000095 - 0.00024;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045;
                  setLng = originLng - 0.00024
                } else if(el['front_order'] === 3) {
                  setLat = originLat - 0.000045;
                  setLng = originLng + 0.000095 - 0.00024;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045;
                setLng = originLng + 0.000205 - 0.00024;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045;
                setLng = originLng - 0.000205 - 0.00024;
              }
            } else if(markerDir === 'E' ) {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045 + 0.000085;
                  setLng = originLng - 0.000095;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045 + 0.000085;
                  setLng = originLng
                } else if(el['front_order'] === 3) {
                  setLat = originLat - 0.000045 + 0.000085;
                  setLng = originLng + 0.000095;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045 + 0.000085;
                setLng = originLng + 0.000205;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045 + 0.000085;
                setLng = originLng - 0.000205;
              }
            } else if(markerDir === 'F' ) {
              if(el['type'] === '直行') {
                if(el['front_order'] === 1) {
                  setLat = originLat - 0.000045;
                  setLng = originLng - 0.000095 + 0.00024;
                } else if(el['front_order'] === 2) {
                  setLat = originLat - 0.000045;
                  setLng = originLng + 0.00024
                } else if(el['front_order'] === 3) {
                  setLat = originLat - 0.000045;
                  setLng = originLng + 0.000095 + 0.00024;
                }
              } else if(el['type'] === '右轉') {
                setLat = originLat - 0.000045;
                setLng = originLng + 0.000205 + 0.00024;
              } else if(el['type'] === '左轉') {
                setLat = originLat - 0.000045;
                setLng = originLng - 0.000205 + 0.00024;
              }
            }
          } else {
            angle = [0, 60, 120, 180, 240 , -60].includes(el['angle']) ? 0 : el['angle'] < 0 ? el['angle'] + 360 : el['angle'];
            originLat = el['position'][0];
            originLng = el['position'][1];
            setLat = originLat;
            setLng = originLng;
          }
        }

        // 工具位置設定
        if(markerDir === 'A') {
          utilLat = setLat;
          utilLng = setLng + 0.000650;
        } else if(markerDir === 'B') {
          utilLat = setLat - 0.000500;
          utilLng = setLng;
        } else if(markerDir === 'C') {
          utilLat = setLat;
          utilLng = setLng - 0.000650;
        } else if(markerDir === 'D') {
          utilLat = setLat + 0.000500;
          utilLng = setLng;
        } else if(markerDir === 'E') {
          // 待調整
          utilLat = setLat;
          utilLng = setLng + 0.000650;
        } else if(markerDir === 'F') {
          // 待調整
          utilLat = setLat;
          utilLng = setLng + 0.000650;
        }

        // 工具icon設定
        let utilIcon = L.divIcon({
          html: '<div class="util-icon" style="display: flex; display: none">' +
          '<img src="./assets/icons/逆.svg" class="minus" data-button="minus" style="margin-right: 5px; width: 30px; height: 30px; cursor: pointer">' +
          '<img src="./assets/icons/順.svg" class="add" data-button="add" style="margin-right: 5px; width: 30px; height: 30px; cursor: pointer">' +
          '</div>',
          className: "util-icon",
          iconAnchor: [30, 15]
        });

        // 工具marker設定
        let rotateInterval;
        let newUtilLatLng;
        let utilBtn: any = L.marker([utilLat, utilLng], {icon: utilIcon})
        .on('mousedown', (e) => {
          // 有偵測到地圖拖曳，就暫停旋轉功能
          this.mapInstance.on('drag', () => {
            clearInterval(rotateInterval);
          })

          // 只偵測左鍵
          if(e['originalEvent']['button'] === 0) {
            let btnType = e['originalEvent']['target']['className'];
            rotateInterval = setInterval(() => {
              if(btnType === 'add') {
                angle = angle + 1;
              } else if(btnType === 'minus') {
                angle = angle - 1;
              }
              this.selectedMarker.setRotationAngle(angle);

              // 更新資料
              this.arrowDataGroup = this.arrowDataGroup.map((el) => {
                if(el['markerDir'] === e.target._markerDir) {
                  el['arrowSetting'].forEach((arrow) => {
                    if(arrow['id'] === e.target._id) {
                      arrow['angle'] = angle;
                    }
                  })
                }
                return el;
              })
            }, 20)
          }
        })
        .on('mouseup', () => {
          clearInterval(rotateInterval);
        })

        // 箭頭icon設定
        let icon = L.divIcon({
          html: this.svgGenerator('general', arrowType, markerDir, directionName),
          className: "svg-icon",
          iconAnchor: el['select_arrow_type'] === '直行' ? [14.5, 66.55] : el['select_arrow_type'] === '右轉' ? [10, 20] : [54, 20]
        });

        // 箭頭marker設定
        let layer: any = L.marker([setLat, setLng], {icon: icon, rotationAngle: angle})
        .on('click', (e) => {
          this.centerService.clickMarker$.next({
            type: 'arrow',
            clickArrow: e['target']['_id'],
            clickMarker: e['target']['_markerDir']
          })
          this.selectedMarkerSetting(e['target']['_id']); // 指定當前marker&設定工具btn
        })
        .on('drag', (e) => {
          this.mapInstance.dragging.disable();
          this.selectedMarkerSetting(e['target']['_id']); // 指定當前marker&設定工具btn

          let position = e.target._latlng;

          // 依照路口類型作設定(三叉/四叉 => A B C D)
          if([...this.allInterType['three'], ...this.allInterType['four'], ...this.allInterType['five'], ...this.allInterType['six']].includes(e.target._intersectionType)) {
            if(e['target']['_markerDir'] === 'A') {
              newUtilLatLng = L.latLng(position.lat, position.lng + 0.000650);
            } else if(e['target']['_markerDir'] === 'B') {
              newUtilLatLng = L.latLng(position.lat - 0.000500, position.lng);
            } else if(e['target']['_markerDir'] === 'C') {
              newUtilLatLng = L.latLng(position.lat, position.lng - 0.000650);
            } else if(e['target']['_markerDir'] === 'D') {
              newUtilLatLng = L.latLng(position.lat + 0.000500, position.lng);
            } else if(e['target']['_markerDir'] === 'E') {
              newUtilLatLng = L.latLng(position.lat, position.lng + 0.000650); // 待調整
            } else if(e['target']['_markerDir'] === 'F') {
              newUtilLatLng = L.latLng(position.lat, position.lng + 0.000650); // 待調整
            }
          }

          this.selectedMarkerBtn.setLatLng(newUtilLatLng); // 更新工具位置
        })
        .on('dragend', (e) => {
          let position = e.target._latlng;
          // 更新資料
          this.arrowDataGroup = this.arrowDataGroup.map((el) => {
            if(el['markerDir'] === e.target._markerDir) {
              el['arrowSetting'].forEach((arrow) => {
                if(arrow['id'] === e.target._id) {
                  arrow['position'] = [position.lat, position.lng];
                }
              })
            }
            return el;
          })
          this.mapInstance.dragging.enable();
        })

        utilBtn._id = `${tc_id}-${markerDir}-${directionName}`;
        utilBtn._markerDir = markerDir;
        utilBtn._intersectionType = intersectionType;
        layer._id = `${tc_id}-${markerDir}-${directionName}`;
        layer._markerDir = markerDir;
        layer._intersectionType = intersectionType;
        el['id'] = layer._id;
        el['position'] = [setLat, setLng];
        this.arrowLayers.push(layer, utilBtn);
      })

      // 儲存該路口所有方向的資訊(將turning_cfg資料存入arrowDataGroup)
      this.arrowDataGroup.push({
        eachRoad: eachRoad, // 各路段名稱
        markerDir: markerDir, // 各箭頭代表方向
        originPosition: [originLat, originLng],
        arrowSetting: arrowSetting
      })
    })

    // 產生箭頭後顯示紅色矩形
    let recSetting: any = {
      topLeft: [this.centerService.markerLatLng[0] + 0.0013 / 2, this.centerService.markerLatLng[1] - 0.0020 / 2],
      topRight: [this.centerService.markerLatLng[0] + 0.0013 / 2, this.centerService.markerLatLng[1] + 0.0020 / 2],
      BottomLeft: [this.centerService.markerLatLng[0] - 0.0013 / 2, this.centerService.markerLatLng[1] - 0.0020 / 2],
      BottomRight: [this.centerService.markerLatLng[0] - 0.0013 / 2, this.centerService.markerLatLng[1] + 0.0020 / 2],
      textPosition: [this.centerService.markerLatLng[0] - 0.0013 / 2 - 0.0001, this.centerService.markerLatLng[1] - 0.0020 / 2 + 0.00105]
    }

    let recPosition = [recSetting['topLeft'], recSetting['topRight'], recSetting['BottomRight'], recSetting['BottomLeft'], recSetting['topLeft']];
    let rectangle = L.polyline(recPosition, { color: 'red', weight: 3, dashArray: '5, 10' });

    let textIcon = L.divIcon({
      html: `<div style="color: red; font-size: 25px; font-weight: 600">超出紅框將不顯示</div>`,
      className: "rectangle-text",
      iconSize: [400, 30]
    });
    let text: any = L.marker(recSetting['textPosition'], {
      icon: textIcon,
    })
    this.arrowLayers.push(rectangle, text);
    this.mapInstance.addLayer(L.layerGroup(this.arrowLayers)); // 呈現在地圖上

    // 編輯狀態設定(開始編輯)
    this.centerService.editStatus$.next({
      openEdit: true,
      tc_id: tc_id,
      roadName: roadName,
      city: city,
      intersectionType: intersectionType,
      roadGroups: roadGroups,
      arrowDataGroup: this.arrowDataGroup // 該路口所有箭頭資訊
    })
  }

  // 當前marker相關設定(直接點擊或拖曳箭頭時，針對當前箭頭和工具btn做設定)
  selectedMarkerSetting(id) {
    // 設定舊marker
    if(typeof this.selectedMarkerBtn !== 'undefined') {
      this.selectedMarkerBtn.getElement().querySelector('.util-icon').style.display = 'none';
      this.selectedMarkerBtn.setZIndexOffset(100); // 工具不顯示時index下移
    }
    // 指定新marker
    this.selectedMarker = this.getMarkerById(id)[0];
    this.selectedMarkerBtn = this.getMarkerById(id)[1];
    this.selectedMarkerBtn.getElement().querySelector('.util-icon').style.display = 'inline-flex';
    this.selectedMarkerBtn.setZIndexOffset(9999); // 工具顯示時設定在圖層最上層
  }

  // 用id尋找marker
  getMarkerById(id) {
    let markerArr = [];
    this.arrowLayers.forEach((marker) => {
      if(marker._id === id) {
        markerArr.push(marker);
      }
    })
    return markerArr;
  }

  // 創建SVG元素
  svgGenerator(type, arrowType, markerDir, directionName) {
    let svgContainer = document.createElement('div');
    if(arrowType === '直行') {
      svgContainer.innerHTML = this.arrowFront;
    } else if(arrowType === '右轉') {
      svgContainer.innerHTML = this.arrowRight;
    } else if(arrowType === '左轉') {
      svgContainer.innerHTML = this.arrowLeft;
    } else if(arrowType === '無') {
      svgContainer.innerHTML = this.arrowNone;
    }

    if(arrowType !== '無') {
      let svgElement = svgContainer.querySelector('#arrow') as SVGElement;
      let text1 = svgElement.querySelector('#markerDir') as SVGElement;
      let text2 = svgElement.querySelector('#eachDir') as SVGElement;
      let path = svgElement.querySelector('#path') as SVGElement;
      text1.innerHTML = markerDir; // 該轉向
      text2.innerHTML = directionName; // 各轉向
      if(type === 'general') {
        path.style.fill = '#2dbdd5'; // 一般樣式
      } else if(type === 'edit') {
        path.style.fill = '#e83b9d'; // 編輯樣式
      }
    }

    let resSVG = svgContainer.innerHTML;
    return resSVG;
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

    // 偵測地圖zoom值重新設定marker樣式
    this.mapInstance.on('zoom', () => {
      this.zoomLevel = this.mapInstance.getZoom();
      if(this.selectStep === 'drawing') {
        if(typeof this.tcGroupOther !== 'undefined') {
          if(this.zoomLevel > 15) {
            Object.values(this.tcGroupOther._layers).forEach((layer: any) => {
              let newIcon = L.icon({iconUrl: layer.options.icon.options.iconUrl, iconSize: [32, 33]});
              layer.setIcon(newIcon);
            })
          } else if (this.zoomLevel === 15) {
            Object.values(this.tcGroupOther._layers).forEach((layer: any) => {
              let newIcon = L.icon({iconUrl: layer.options.icon.options.iconUrl, iconSize: [24, 24]});
              layer.setIcon(newIcon);
            })
          } else if (this.zoomLevel === 14) {
            Object.values(this.tcGroupOther._layers).forEach((layer: any) => {
              let newIcon = L.icon({iconUrl: layer.options.icon.options.iconUrl, iconSize: [18, 18]});
              layer.setIcon(newIcon);
            })
          } else if(this.zoomLevel <= 13) {
            Object.values(this.tcGroupOther._layers).forEach((layer: any) => {
              let newIcon = L.icon({iconUrl: layer.options.icon.options.iconUrl, iconSize: [11, 11]});
              layer.setIcon(newIcon);
            })
          }
        }
      }
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

  // 取得TC資料
  getData() {
    // 取得所有TC點位資料(包含status)
    this.centerService.get('/api/turning/status').subscribe({
      next: (res) => {
        this.positionData = res['data'].filter(e => {
          if(this.main_tc.includes(e['tc_id']) && this.district_new.includes(e['city'])) return e;
        });
        this.positionDataOther = res['data'].filter(e => !this.main_tc.includes(e['tc_id'])); // 先照舊
        this.iconSetting();

        // 設定地圖的中心位置
        if(this.district_new.length === 1) {
          switch(this.district_new[0]) {
            case '新竹市':
              this.flyto2([24.8063117, 120.960879], 16);
              break;
            case '台北市':
              this.flyto2([25.0514376, 121.5353965], 14);
              break;
            default:
              this.flyto2([25.0514376, 121.5353965], 14);
              break;
          }
        } else {
          this.flyto2([25.0514376, 121.5353965], 14); // 預設(暫定北市)
        }
      },
      error: (err) => {
        console.log(err);
        if (err.error.msg === 'Token has expired') {
          this.authService.signOut(); // token過期登出
        }
      }
    });
  }

  // 圖層開關顯示設定
  mapControlDisplay(control) {
    // 橘色
    if(control.uploadStatus) {
        Object.values(this.tcGroup._layers).forEach(layer => {
          if(layer['_status'] === 'upload_data') {
            this.mapInstance.addLayer(layer);
          }
        })
    } else {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'upload_data') {
          this.mapInstance.removeLayer(layer);
        }
      })
    }

    // 藍色
    if(control.settingStatus) {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'setting_data') {
          this.mapInstance.addLayer(layer);
        }
      })
    } else {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'setting_data') {
          this.mapInstance.removeLayer(layer);
        }
      })
    }

    // 灰色
    if(control.nodataStatus) {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'no_data') {
          this.mapInstance.addLayer(layer);
        }
      })
    } else {
      Object.values(this.tcGroup._layers).forEach(layer => {
        if(layer['_status'] === 'no_data') {
          this.mapInstance.removeLayer(layer);
        }
      })
    }
  }

  // 設定不同zoom值icon
  iconSetting() {
    let icon_type = {}
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

    if(this.selectStep === 'select') {
      this.markerLayout(icon_type); // 路口選擇
    } else if(this.selectStep === 'drawing') {
      this.markerLayoutOther(icon_type); // 路段繪製
    }
  }

  // 在地圖上呈現TC Marker
  markerLayout(icon_type) {
    // 清空原有的marker
    if(typeof this.tcGroup !== 'undefined') {
      this.tcGroup.clearLayers();
    }

    // 呈現marker
    const layers = [];
    this.positionData.forEach((e) => {
      let tcIcon = e.turning ? icon_type.setting_data : (e.volume || e.delay) ? icon_type.upload_data : icon_type.no_data;
      let layer: any = L.marker([e.lat, e.lng], {icon: tcIcon})
      .bindTooltip(`${e.tc_id} ${e.road}`, { offset: L.point({ x: 0, y: -20 }), direction: 'top' }).openTooltip()
      .on('click', () => {
        if(this.selectStep === 'select') {
          if(e['volume'] || e['delay']) {
            this.mapInstance.dragging.disable(); // 鎖定拖曳事件
            this.mapInstance.scrollWheelZoom.disable(); // 鎖定滾輪事件
            this.arrowDataGroup.length = 0; // 清空之前的路口資料
            // 清除之前的箭頭圖層與資料
            this.arrowLayers.forEach(layer => {
              this.mapInstance.removeLayer(layer);
            });
            this.arrowLayers = [];

            // 取得路口定義資料
            this.centerService.get(`/api/turning/search/svg_detail/${e['tc_id']}`).subscribe({
              next: (res) => {
                // 打API取得編輯狀態(待調整)
                this.centerService.post('/api/turning/get_turning_status', {tc_id: e['tc_id']}).subscribe((res) => {
                  this.centerService.test$.next({
                    first: true,
                    status: res['data']
                  })
                })
                this.centerService.tc_id = e['tc_id'];
                this.centerService.markerLatLng = [e.lat, e.lng];
                this.flyto([this.centerService.markerLatLng[0] + 0.00028, this.centerService.markerLatLng[1] + 0.0016], 18); // 位置偏左
                this.centerService.isMoving = true;

                this.intersectionType = res['data']['intersection_type'];
                let intersectionType = res['data']['intersection_type'];
                let roadGroups = res['data']['road_groups'];
                let turningConfig = [];

                // 延滯資料轉換路口類型名稱
                if(intersectionType.includes('(假日')) {
                  intersectionType = intersectionType.split('(假日')[0];
                }

                // 四叉/五叉/六叉不用處理，三叉由四叉資料修正而來(依照資料回傳的筆數判定路口類型)
                if(res['data']['turning_config'].length !== 3) {
                  turningConfig = res['data']['turning_config'];
                } else {
                  let originTurningConfig = res['data']['turning_config'];
                  let allDirection = ['A', 'B', 'C', 'D'];
                  let directionArr = originTurningConfig.map((e) => e['marker_dir']);
                  let no_dir = allDirection.filter(e => !directionArr.includes(e))[0];

                  originTurningConfig = originTurningConfig.map((e) => {
                    let nowDirArr = e['arrow_setting'].map(el => el['direction_name']);
                    let dir_index = nowDirArr.findIndex(e => e === no_dir); // dir_index不是-1代表初次編輯(需進行轉換)
                    if(dir_index !== -1) {
                      e['arrow_setting'] = e['arrow_setting'].filter(el => el['direction_name'] !== no_dir);
                    }
                    return e;
                  })
                  turningConfig = originTurningConfig;
                }

                setTimeout(() => {
                  this.createArrowMarker(e['tc_id'], e['road'], intersectionType, roadGroups, turningConfig, e['city']);
                }, this.zoomLevel <= 14 ? 2000 : 1200)
              },
              error: (err) => {
                console.log(err);
                if(err.error.msg === 'Token has expired') {
                  this.authService.signOut(); // token過期登出
                } else {
                  this.mapInstance.dragging.enable();
                  this.mapInstance.scrollWheelZoom.enable();
                  alert('資料有誤，請選擇其他路口');
                }
              }
            })
          } else {
            this.remind('需有上傳紀錄才可進行路口編輯', 'red', false);
          }
        } else {
          if(this.centerService.tc_id !== e['tc_id']) {
            this.remind('若要編輯其他路口，請回到路口選擇頁面重新選取路口', 'red', false);
          }
        }
      });
      layer._id = e['tc_id'];
      layer._status = e.turning ? 'setting_data' : (e.volume || e.delay) ? 'upload_data' : 'no_data';
      layers.push(layer);
    })

    this.tcGroup = L.layerGroup(layers);
    this.mapInstance.addLayer(this.tcGroup); // 呈現在地圖上
  }

  // 路段繪製頁面呈現選單外的marker
  markerLayoutOther(icon_type) {
    // 清空原有的marker
    if(typeof this.tcGroupOther !== 'undefined') {
      this.tcGroupOther.clearLayers();
    }

    // 呈現marker
    const layers = [];
    this.positionDataOther.forEach((e) => {
      let layer: any = L.marker([e.lat, e.lng], {icon: e.turning ? icon_type.setting_data : (e.volume || e.delay) ? icon_type.upload_data : icon_type.no_data})
      .bindTooltip(`${e.tc_id} ${e.road}`, { offset: L.point({ x: 0, y: -20 }), direction: 'top' }).openTooltip()
      .on('click', () => {
        if(this.selectStep === 'drawing') {
          if(this.centerService.tc_id !== e['tc_id']) {
            this.remind('若要編輯其他路口，請回到路口選擇頁面重新選取路口', 'red', false);
          }
        }
      });
      layer._id = e['tc_id'];
      layer._status = e.turning ? 'setting_data' : (e.volume || e.delay) ? 'upload_data' : 'no_data';
      layers.push(layer);
    })

    this.tcGroupOther = L.layerGroup(layers);
    this.mapInstance.addLayer(this.tcGroupOther); // 呈現在地圖上
  }

  // 取得路段繪製頁面資料
  getRoadDrawingData() {
    // this.centerService.tc_id = 'TC212'; // 開發用
    this.roadSectionGroup = [];
    this.allPolyline = [];
    this.centerService.get(`/api/turning/search/road_section/${this.centerService.tc_id}`).subscribe((res) => {
      // 儲存該路口路段繪製相關的資訊(將後端road_section資料存入roadSectionGroup)
      res['data']['lines'].forEach((e) => {
        this.roadSectionGroup.push({
          id: `${this.centerService.tc_id}-${e['direction']}`,
          roadName: e['road_name'],
          direction: e['direction'],
          location: e['location'] === null ? [] : e['location'] // null代表首次編輯(包含全部刪除)，若不是就取得之前資料
        })
        this.allPolyline.push({
          id: `${this.centerService.tc_id}-${e['direction']}`,
          status: null // 預設為null(之後polyline圖層畫出來後會再更新)
        });
        this.roadSectionGroupSave = JSON.parse(JSON.stringify(this.roadSectionGroup)); // 存取最開始的資訊
      })

      // 取得經緯度資料後，繪製polyline
      this.drawPolyline();

      // 傳送該路口資訊給左側元件顯示路口相關資訊
      this.centerService.sendRoadSectionInfo$.next({
        road: res['data']['road'],
        roadSectionGroup: this.roadSectionGroup
      })

      // 三叉要調整(加入空資料變成四項)
      if(this.roadSectionGroup.length === 3) {
        this.testRoadGroup = this.roadSectionGroup.slice();
        let allDirection = ['A', 'B', 'C', 'D'];
        let directionArr = this.testRoadGroup.map((e) => e['direction']);
        let no_dir = allDirection.filter(e => !directionArr.includes(e))[0];

        let type = {A: 0, B: 1, C: 2, D: 3}
        this.testRoadGroup.splice(type[no_dir], 0, {
          id: '',
          roadName: '',
          direction: '',
          location: []
        });
      } else {
        this.testRoadGroup = this.roadSectionGroup.slice();
      }

      // [防呆]地圖中心位置有變動時，從其他頁面切頁回路段繪製需要時間跑回TC中心點，避免在此期間切頁到路口選擇/路口定義導致圖層錯誤
      if(this.selectStep === 'select' || this.selectStep === 'definition') {
        // 隱藏路段相關圖層
        this.roadLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.circleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.triangleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
      }
    })
  }

  // 繪製從後端取得紀錄的polyline
  drawPolyline() {
    this.roadSectionGroup.forEach((e) => {
      if(e['location'].length !== 0) {
        let polylineRecord: any = L.polyline(e['location'], { color: '#CE8732', weight: 7})
        .on('click', (event) => {
          // 點選箭頭後傳訊息給drawing-info的路段選擇，直接執行相同流程
          this.centerService.clickMarker$.next({
            type: 'road',
            data: {
              id: event['target']['_id'],
              roadName: event['target']['_roadName'],
              direction: event['target']['_direction'],
              location: event['target']['_latlngs']
            }
          })
        })
        polylineRecord._id = e['id'];
        polylineRecord._roadName = e['roadName'];
        polylineRecord._direction = e['direction'];
        this.roadLayers.push(polylineRecord);
        this.mapInstance.addLayer(L.layerGroup(this.roadLayers)); // 呈現在地圖上

        // 更新polyline
        this.allPolyline = this.allPolyline.map((el) => {
          if(el['id'] === polylineRecord['_id']) {
            el['status'] = polylineRecord;
          }
          return el;
        });

        this.tempLatlng = e['location'];
        this.tempId = e['id'];

        // 設定三角形箭頭
        this.setTriangleMarker('#CE8732', 'first');
      }
    })
  }

  // 繪製/更新polyline
  createOrEditPolyline() {
    this.mapInstance.getContainer().style.cursor = 'crosshair';
    // nowPolyline無內容(也可能因為刪除過所以location是空陣列) => 首次編輯 => 直接繪製新polyline
    // nowPolyline有內容 => 二次編輯 => 設定狀態&找出該polyline進行編輯
    if(this.nowPolyline === null || this.selectedRoadData['location'].length === 0) {
      this.isFirstEdit = true;
      let layer: any = L.polyline([], { color: '#e83b9d', weight: 7}) // 繪製polyline
      .on('click', (e) => {
        // 點選箭頭後傳訊息給drawing的路段選擇，直接執行相同流程
        this.centerService.clickMarker$.next({
          type: 'road',
          data: {
            id: e['target']['_id'],
            roadName: e['target']['_roadName'],
            direction: e['target']['_direction'],
            location: e['target']['_latlngs']
          }
        })
      })
      layer._id = this.selectedPolyline['id'];
      layer._direction = this.selectedRoadData['direction'];
      layer._roadName = this.selectedRoadData['roadName'];
      this.roadLayers.push(layer);
      this.mapInstance.addLayer(L.layerGroup(this.roadLayers)); // 呈現在地圖上
      this.nowPolyline = layer; // 將當前的polyline layer指定給nowPolyline
    } else {
      this.isFirstEdit = false;
      this.nowPolyline.setStyle({color: '#e83b9d'})
      .on('click', (e) => {
        // 點選箭頭後傳訊息給drawing的路段選擇，直接執行相同流程
        this.centerService.clickMarker$.next({
          type: 'road',
          data: {
            id: e['target']['_id'],
            roadName: e['target']['_roadName'],
            direction: e['target']['_direction'],
            location: e['target']['_latlngs']
          }
        })
      })
      this.clickLatlngRecord = this.nowPolyline['_latlngs'];
      let endPoint = this.clickLatlngRecord[this.clickLatlngRecord.length - 1];

      // 設定紅色圓點(產生對應個數的點與設定idx)
      this.clickLatlngRecord.forEach((latlngRecord, i) => {
        this.setCircleMarker(latlngRecord, 'default', i);
      })

      // 隱藏最後一個圓點
      if(this.clickLatlngRecord.length >= 2) {
        this.circleLayers.forEach(layer => {
          let res = layer['_latlng']['lat'] === endPoint['lat'] && layer['_latlng']['lng'] === endPoint['lng'] ? 'none' : 'block';
          let circleDisplay = L.divIcon({
            html: `<div class="circle" data-button="circle" style="width: 16px; height: 16px; cursor: pointer; border-radius: 50%; background-color: #f50a58; display: ${res}"></div>`,
            className: "circle",
            iconSize: [16, 16]
          });
          layer.setIcon(circleDisplay);
        })
      }

      // 設定三角形箭頭
      if(this.clickLatlngRecord.length >= 2) {
        this.setTriangleMarker('#f50a58', 'edit');
      }
    }

    // 地圖事件
    this.mapInstance.on('click', (e) => {
      // isFirstEdit true => 首次編輯 => 可以產生新節點
      // isFirstEdit false => 二次編輯 => 不可產生新節點
      if(this.isFirstEdit) {
        this.countIdx = this.countIdx + 1;
        this.clickLatlngRecord.push(e.latlng);
        this.nowPolyline.setLatLngs(this.clickLatlngRecord); // 將新增的點加入polyline
        let startPoint = this.clickLatlngRecord[this.clickLatlngRecord.length - 2];
        let endPoint = this.clickLatlngRecord[this.clickLatlngRecord.length - 1];

        // 設定紅色圓點
        this.setCircleMarker(e.latlng, 'click', '');

        // 隱藏最後一個圓點
        if(this.clickLatlngRecord.length >= 2) {
          this.circleLayers.forEach(layer => {
            let res = layer['_latlng']['lat'] === endPoint['lat'] && layer['_latlng']['lng'] === endPoint['lng'] ? 'none' : 'block';
            let circleDisplay = L.divIcon({
              html: `<div class="circle" data-button="circle" style="width: 16px; height: 16px; cursor: pointer; border-radius: 50%; background-color: #f50a58; display: ${res}"></div>`,
              className: "circle",
              iconSize: [16, 16]
            });
            layer.setIcon(circleDisplay);
          })
        }

        if(this.clickLatlngRecord.length >= 2) {
          // 刪除之前的三角形箭頭(只保留最新箭頭)
          if(this.triangleLayers.length > 0) {
            this.triangleLayers.forEach((layer) => {
              if(layer._id === this.nowPolyline._id) {
                this.mapInstance.removeLayer(layer)
              }
            })
            this.triangleLayers = this.triangleLayers.filter(e => e._id !== this.nowPolyline._id);
          }
          // 設定三角形箭頭
          this.setTriangleMarker('#f50a58', 'edit');

          // dblclick事件無法偵測以這裡代替
          if(startPoint['lat'] === endPoint['lat'] && startPoint['lng'] === endPoint['lng']) {
            let latlng1 = this.clickLatlngRecord[this.clickLatlngRecord.length - 3]; // 倒數第三個點
            let latlng2 = this.clickLatlngRecord[this.clickLatlngRecord.length - 1]; // 最後一個點
            let distance = latlng1.distanceTo(latlng2);
            this.isFirstEdit = false;
            this.changeDetectorRef.detectChanges();
            // 距離正常 => 算一個點(經緯度紀錄減一項)
            // 距離太近 => 不算新點(經緯度紀錄減兩項)
            if(distance > 8) {
              this.countIdx = this.countIdx - 1; // 刪除最後一個idx紀錄
              this.clickLatlngRecord.pop(); // 刪除最後一個經緯度紀錄
              this.nowPolyline['_latlngs'].pop(); // 刪除polyline資料的最後一項經緯度
              this.tempFinishDrawing();
            } else {
              this.countIdx = this.countIdx - 2; // 刪除最後兩個idx紀錄
              this.clickLatlngRecord.pop(); // 刪除最後兩個經緯度紀錄
              this.clickLatlngRecord.pop()
              this.nowPolyline['_latlngs'].pop(); // 刪除polyline資料的最後兩項經緯度
              this.nowPolyline['_latlngs'].pop();
              this.tempFinishDrawing();
            }
          }
        }

        // 引線設定
        let tempPolyline = L.polyline([], {
          color: '#e83b9d',
          dashArray: '5, 10' // 虛線
        })
        .addTo(this.mapInstance);

        // 偵測mousemove事件，引線起點為最後一次click的點，終點為mousemove的最後一個點
        if(typeof this.nowPolyline !== 'undefined') {
          let record = this.clickLatlngRecord;
          if(record.length !== 0) {
            this.mapInstance.on('mousemove', function(el) {
              let latlngs = [record[record.length - 1], el.latlng];
              tempPolyline.setLatLngs(latlngs);
            });
          } else {
            this.mapInstance.off('mousemove');
          }
        }
        this.tempPolylineLayers.push(tempPolyline);
      }
    });
  }

  // 刪除/回復
  changePolyline(status) {
    if(this.isEditing) {
      if(status === 'delete') {
        this.nowPolyline.setLatLngs([]);
        // 刪除圓點圖層與資料
        this.circleLayers.forEach(layer => {
          this.mapInstance.removeLayer(layer);
        });
        this.circleLayers = [];
        // 刪除三角形箭頭圖層與資料
        this.triangleLayers.forEach(layer => {
          if(layer._id === this.nowPolyline._id) {
            this.mapInstance.removeLayer(layer)
          }
        })
        this.triangleLayers = this.triangleLayers.filter(e => e._id !== this.selectedPolyline['id']);
        this.countIdx = 0; // circle的index要重計
        this.clickLatlngRecord = []; // 點到過的經緯度紀錄清除
        this.isFirstEdit = true;
      } else if(status === 'back') {
        if(this.countIdx > 0) {
          // 重設polyline(拿掉最後一項)
          let polylineLatLng = this.nowPolyline._latlngs;
          polylineLatLng.pop();
          this.nowPolyline.setLatLngs(polylineLatLng);
          // 重設圓點圖層(拿掉最後一項)
          let circleLayersLength = this.circleLayers.length;
          this.circleLayers.forEach(layer => {
            if(layer._idx === circleLayersLength) {
              this.mapInstance.removeLayer(layer);
            }
          })
          this.circleLayers.pop();
          // 刪除三角形箭頭圖層
          this.triangleLayers.forEach(layer => {
            if(layer._id === this.nowPolyline._id) {
              this.mapInstance.removeLayer(layer);
            }
          })
          this.triangleLayers = this.triangleLayers.filter(e => e._id !== this.selectedPolyline['id']);
          this.countIdx--; // circle的index減1
          this.clickLatlngRecord.pop(); // 點到過的經緯度紀錄移除最後一項

          // 隱藏最後一個圓點
          if(this.clickLatlngRecord.length > 1) {
            this.circleLayers.forEach(layer => {
              if(layer['_latlng']['lat'] === this.clickLatlngRecord[this.clickLatlngRecord.length - 1]['lat'] &&
                layer['_latlng']['lng'] === this.clickLatlngRecord[this.clickLatlngRecord.length - 1]['lng']) {
                let circleDisplay = L.divIcon({
                  html: '<div class="circle" data-button="circle" style="width: 16px; height: 16px; cursor: pointer; border-radius: 50%; background-color: #f50a58; display: none"></div>',
                  className: "circle",
                  iconSize: [16, 16]
                });
                layer.setIcon(circleDisplay);
              }
            })
            // 設定三角形箭頭
            this.setTriangleMarker('#f50a58', 'edit');
          }
        }
      }

      // 清空引線(避免最後一條留在頁面上)
      if(this.circleLayers.length === 0) {
        this.tempPolylineLayers.forEach(layer => {
          layer.setLatLngs([]);
        })
        this.mapInstance.off('mousemove');
      }
    }
  }

  // 完成單一路段
  tempFinishDrawing() {
    this.mapInstance.getContainer().style.cursor = 'grab';
    this.mapInstance.off('mousemove');
    this.mapInstance.off('click'); // 清除之前的click事件避免事件被重複偵測

    // 清空引線(避免最後一條留在頁面上)
    this.tempPolylineLayers.forEach(layer => {
      layer.setLatLngs([]);
    })

    this.triangleLayers.forEach((layer) => {
      if(layer._id === this.nowPolyline._id) {
        this.mapInstance.removeLayer(layer)
      }
    })
    this.triangleLayers = this.triangleLayers.filter(e => e._id !== this.nowPolyline._id);

    // 有經緯度紀錄才需要針對樣式做調整
    if(this.clickLatlngRecord.length > 1) {
      // 設定三角形箭頭
      this.setTriangleMarker('#CE8732', 'edit');

      // 修改polyline樣式與隱藏circle圖層
      this.nowPolyline.setStyle({color: '#CE8732'});
      this.circleLayers.forEach(layer => {
        this.mapInstance.removeLayer(layer);
      })
    }

    // 更新該筆資料
    this.selectedRoadData['location'] = this.nowPolyline['_latlngs'].length > 1 ? this.nowPolyline['_latlngs'] : [];
    this.selectedPolyline['status'] = this.nowPolyline;

    // 從整個路口資料中找出目前的資料做更新
    this.roadSectionGroup = this.roadSectionGroup.map((e) => {
      if(e['id'] === this.nowPolyline['_id']) {
        e = this.selectedRoadData;
      }
      return e;
    })

    // 從整個polyline資料中找出目前的資料做更新
    this.allPolyline = this.allPolyline.map((e) => {
      if(e['id'] === this.nowPolyline['_id']) {
        e = this.selectedPolyline;
      }
      return e;
    })

    // 清空之前資料
    this.circleLayers = []; // 清空圓點marker資料
    this.clickLatlngRecord = []; // 避免累加到前一條路段的經緯度資料
    this.countIdx = 0; // 避免從前一條路段的polyline idx延續設定
    this.isEditing = false;
    this.triangleLayers.forEach(layer => {
      layer.dragging.disable();
    })

    // 每次暫時完成都傳送訊息給drawing-info元件
    this.centerService.tempFinish$.next(true);
  }

  // 儲存/取消路段繪製資料
  saveOrCancelRes(status) {
    this.centerService.isEditing = false;
    // 若沒有完成編輯狀態 => 自動存好該條路段資料後再執行儲存
    if(this.isEditing) {
      this.tempFinishDrawing();
    }
    if(status === 'save') {
      // 儲存資料到後端
      let dataRes =  [];
      this.roadSectionGroup.forEach((e) => {
        dataRes.push({
          direction: e['direction'],
          road_name: e['roadName'],
          location: e['location']
        })
      })

      let noLocationData = dataRes.every((e) => e['location'].length === 0);

      this.centerService.test$.next({
        first: false,
        change: {page: 'p3', status: noLocationData? false : true}
      })

      let sendData = {
        lines: dataRes
      }

      let req_body = {
        tc_id: this.centerService.tc_id,
        road_section: noLocationData ? '' : JSON.stringify(sendData) // 檢查是否所有路段都沒有資料(true=>回傳空字串/false=>回傳一般結果)
      }

      this.centerService.post('/api/turning/update', req_body).subscribe({
        next: (res) => {
          this.remind('儲存成功', 'green', true);
          this.roadSectionGroupSave = JSON.parse(JSON.stringify(this.roadSectionGroup)); // 更新初始資料
          this.centerService.changeTCIcon$.next(true); // 檢查是否需要更改icon顏色
        },
        error: (err) => {
          console.log(err);
          if (err.error.msg === 'Token has expired') {
            this.authService.signOut(); // token過期登出
          }
        }
      })
    } else if(status === 'cancel') {
      this.remind('取消編輯', 'green', true);

      // 清除路段相關圖層與資料
      this.roadLayers.forEach(layer => {
        this.mapInstance.removeLayer(layer);
      });
      this.circleLayers.forEach(layer => {
        this.mapInstance.removeLayer(layer);
      });
      this.triangleLayers.forEach(layer => {
        this.mapInstance.removeLayer(layer);
      });
      this.roadLayers = [];
      this.circleLayers = [];
      this.triangleLayers = [];
      this.getRoadDrawingData(); // 重新取得路段繪製資料
    }
  }

  // 設定紅色圓點
  setCircleMarker(latlng, type, idx) {
    let icon = L.divIcon({
      html: '<div class="circle" data-button="circle" style="width: 16px; height: 16px; cursor: pointer; border-radius: 50%; background-color: #f50a58; display: block"></div>',
      className: "circle",
      iconSize: [16, 16]
    });

    let circle: any = L.marker(latlng, {
      icon: icon,
      draggable: true
    })
    .on('drag', (e: any) => {
      if(this.isEditing) {
        // 找出拖曳哪個點 => 該點代表polyline中的哪個點 => 修改該點經緯度 => 重設polyline經緯度
        let polylineLatLng = this.nowPolyline._latlngs;
        polylineLatLng[e.target._idx - 1] = e.target.getLatLng();
        this.nowPolyline.setLatLngs(polylineLatLng);
        this.clickLatlngRecord[e.target._idx - 1] = e.target.getLatLng();

        // 移動倒數第二個點要調整三角形箭頭角度
        if(e.target.getLatLng()['lat'] === this.clickLatlngRecord[this.clickLatlngRecord.length - 2]['lat'] &&
           e.target.getLatLng()['lng'] === this.clickLatlngRecord[this.clickLatlngRecord.length - 2]['lng']) {
          let startPoint = this.clickLatlngRecord[this.clickLatlngRecord.length - 2];
          let endPoint = this.clickLatlngRecord[this.clickLatlngRecord.length - 1];
          let angleRes = this.getArrowHeadAngle(startPoint, endPoint);
          this.triangleLayers.forEach(layer => {
            if(layer._id === this.nowPolyline._id) {
              layer.setRotationAngle(angleRes);
            }
          })
        }
      }
    })
    circle._idx = type === 'default' ? idx + 1 : this.countIdx;
    this.circleLayers.push(circle);
    this.mapInstance.addLayer(L.layerGroup(this.circleLayers)); // 呈現在地圖上
  }

  // 設定三角形箭頭
  setTriangleMarker(color, type) {
    // 取得三角形marker角度
    let startPoint, endPoint;
    if(type === 'first') {
      startPoint = this.tempLatlng[this.tempLatlng.length - 2];
      endPoint = this.tempLatlng[this.tempLatlng.length - 1];
    } else if(type === 'edit') {
      startPoint = this.clickLatlngRecord[this.clickLatlngRecord.length - 2];
      endPoint = this.clickLatlngRecord[this.clickLatlngRecord.length - 1];
    }
    let angleRes = this.getArrowHeadAngle(startPoint, endPoint);

    // 新增三角形marker
    let iconTest = L.divIcon({
      html: `<div class="triangle" data-button="triangle" style="width: 30px; height: 30px; cursor: pointer; clip-path: polygon(50% 0%, 0% 100%, 100% 100%); background-color: ${color}; opacity: 1"></div>`,
      className: "triangle",
      iconSize: [30, 30]
    });

    let triangle: any = L.marker(endPoint, {
      icon: iconTest,
      rotationAngle: angleRes,
      rotationOrigin: "center center",
      draggable: true
    })
    .on('drag', (e: any) => {
      if(this.isEditing) {
        // 找出拖曳哪個點 => 該點代表polyline中的哪個點 => 修改該點經緯度 => 重設polyline經緯度
        let polylineLatLng = this.nowPolyline._latlngs;
        polylineLatLng[polylineLatLng.length - 1] = e.target.getLatLng();
        this.nowPolyline.setLatLngs(polylineLatLng);
        this.clickLatlngRecord[this.clickLatlngRecord.length - 1] = e.target.getLatLng();

        // 調整三角形箭頭角度
        let startPoint = this.clickLatlngRecord[this.clickLatlngRecord.length - 2];
        let endPoint = this.clickLatlngRecord[this.clickLatlngRecord.length - 1];
        let angleRes = this.getArrowHeadAngle(startPoint, endPoint);
        this.triangleLayers.forEach(layer => {
          if(layer._id === this.nowPolyline._id) {
            layer.setRotationAngle(angleRes);
          }
        })

        // 圓點圖層最後一點位置修正
        let circleLatLng = this.circleLayers[this.circleLayers.length - 1]._latlng;
        circleLatLng = e.target.getLatLng();
        this.circleLayers[this.circleLayers.length - 1]._latlng = circleLatLng;
      }
    })

    triangle._id = type === 'first' ? this.tempId : this.selectedPolyline['id'];
    this.triangleLayers.push(triangle);
    this.mapInstance.addLayer(L.layerGroup(this.triangleLayers)); // 呈現在地圖上
  }

  // 取得polyline最後一點的箭頭旋轉角度
  getArrowHeadAngle(startPoint, endPoint) {
    let latlngsVertical = L.polyline([[20, 120], [25, 120]]).getLatLngs(); // 垂直線

    let startPoint1: any = latlngsVertical[0]; // 垂直線polyline起點
    let endPoint1: any = latlngsVertical[1]; // 垂直線polyline終點
    let startPoint2 = { lat: startPoint['lat'], lng: startPoint['lng'] };
    let endPoint2 = { lat: endPoint['lat'], lng: endPoint['lng'] };

    // 兩條polyline向量
    let vector1 = L.point(endPoint1.lat - startPoint1.lat, endPoint1.lng - startPoint1.lng);
    let vector2 = L.point(endPoint2.lat - startPoint2.lat, endPoint2.lng - startPoint2.lng);

    // 兩個向量的點積
    let dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;

    // 兩個向量的模
    let magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    let magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

    // 夾角的餘弦值
    let cosTheta = dotProduct / (magnitude1 * magnitude2);

    // 夾角的弧度值
    let theta = Math.acos(cosTheta);

    // 弧度轉為度數
    let angle = theta * (180 / Math.PI);

    // 判段方向
    let angleRes = startPoint2['lng'] < endPoint2['lng'] ? angle : 360 - angle;
    return angleRes;
  }

  // 地圖定位
  flyto(center: number[], zoom) {
    this.mapInstance.flyTo(center, zoom);
  }

  // 地圖定位(測試)
  flyto2(center: number[], zoom) {
    this.mapInstance.flyTo(center, zoom, {
      animate: false,
      // duration: 1
    });
  }

  // 回到原點
  backToCenter(type) {
    if(type === 'drawing') {
      this.mapInstance.panTo(new L.LatLng(this.centerService.markerLatLng[0] + 0.00028, this.centerService.markerLatLng[1]));
    } else if(type === 'definition') {
      this.mapInstance.panTo(new L.LatLng(this.centerService.markerLatLng[0] + 0.00028, this.centerService.markerLatLng[1] + 0.0016));
    }
  }

  // snackbar提示設定
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

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  // 直行
  arrowFront = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="127" viewBox="0 0 44.171 191">
  <g id="arrow" data-name="arrow" transform="translate(-579.918 -638)">
    <text id="markerDir" transform="translate(595 822)" fill="#000" font-size="22" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC"><tspan x="0" y="0"></tspan></text>
    <text id="eachDir" transform="translate(595 664)" fill="#000" font-size="22" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC"><tspan x="0" y="0"></tspan></text>
    <path id="path" data-name="path 2664" d="M607.406,887.057,585.323,863.3l-22.088,23.752,3.956,3.684,14.269-15.35v98.523h7.717V875.381L603.45,890.74Z" transform="translate(16.683 -185.304)" fill="#2dbdd5"/>
  </g>
  </svg>`

  // 右轉
  arrowRight = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 96 120.578">
  <g id="arrow" data-name="arrow" transform="translate(-595 -708.422)">
    <text id="markerDir" transform="translate(595 822)" fill="#000" font-size="22" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC"><tspan x="0" y="0"></tspan></text>
    <text id="eachDir" transform="translate(675 739)" fill="#000" font-size="22" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC"><tspan x="0" y="0"></tspan></text>
    <path id="path" data-name="path" d="M608.943,870.526l-3.683,3.955,15.349,14.269h-9.238a43.836,43.836,0,0,0-43.782,43.786v18.37h7.718v-18.37a36.1,36.1,0,0,1,36.063-36.067h9.25L605.26,910.741l3.683,3.955L632.7,892.614Z" transform="translate(30.554 -162.104)" fill="#2dbdd5"/>
  </g>
  </svg>`

  // 左轉
  arrowLeft = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 96 120.582">
  <g id="arrow" data-name="arrow" transform="translate(-513 -708.418)">
    <text id="markerDir" transform="translate(595 822)" fill="#000" font-size="22" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC"><tspan x="0" y="0"></tspan></text>
    <text id="eachDir" transform="translate(513 737)" fill="#000" font-size="22" font-family="NotoSansCJKtc-Regular, Noto Sans CJK TC"><tspan x="0" y="0"></tspan></text>
    <path id="path" data-name="path" d="M575.2,888.753h-9.246l15.357-14.273-3.683-3.955-23.753,22.083L577.63,914.7l3.683-3.955-15.349-14.269H575.2a36.108,36.108,0,0,1,36.067,36.067V950.91h7.718V932.539A43.836,43.836,0,0,0,575.2,888.753Z" transform="translate(-12.877 -162.107)" fill="#2dbdd5"/>
  </g>
  </svg>`

  // 無方向(透明箭頭)
  arrowNone = '';
}
