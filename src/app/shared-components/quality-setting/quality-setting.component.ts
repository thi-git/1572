import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { Component, OnInit, ViewChild } from '@angular/core';
import { CenterService } from 'src/app/pages/center.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionPanel } from '@angular/material/expansion';

@Component({
  selector: 'app-quality-setting',
  templateUrl: './quality-setting.component.html',
  styleUrls: ['./quality-setting.component.scss']
})
export class QualitySettingComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @ViewChild('panel') panel: MatExpansionPanel;
  selectEditStep = '';
  roadArr = []; // 儲存每筆資料
  selectResult = []; // 儲存使用者最後所選內容，如果沒有調整，就套用預設內容
  panelOpen = false;

  // 左側資訊區塊
  left_test_arr = [];

  // 右側編輯區塊
  right_test_arr = [];

  // 各路段panel設定
  road_right = [];
  road_bottom = [];
  road_left = [];
  road_top = [];

  // 各對應方向panel設定
  dir_right = [];
  dir_bottom = [];
  dir_left = [];
  dir_top = [];

  directionSetting = '';
  checkSetting = '';
  order = [];

  // 對應方向
  top_test_arr = [];
  bottom_test_arr = [];
  left_test_arr_2 = [];
  right_test_arr_2 = [];

  selectDate = '';

  constructor(
    private centerService: CenterService,
    private snackBar: MatSnackBar
  ) {
    this.centerService.editSelect$
    .pipe(takeUntil(this.destroyed$))
    .subscribe(res => {
      this.selectEditStep = res['selectEditStep'];
    })

    this.centerService.sendBasicData$
    .pipe(takeUntil(this.destroyed$))
    .subscribe(res => {
      if(res['basicData'].length > 0) {
        this.roadArr.length = 0; // 清空資料
        this.order = res['order'];
        this.selectDate = res['selectDate'];

        // 方向設定
        this.directionSetting = res['direction'];
        this.checkSetting = res['check'];

        // 正式資料
        // 取得的資料顯示於區塊
        res['basicData'].forEach((e, i) => {
          let road_drive_dir = Object.values(e)[0]['each_drive_dir'].map((item, index) => `${Object.values(e)[0]['each_road'][index]}${item}`);
          let dir_index = Object.values(e)[0]['each_dir'].map(item => `${item}${i + 1}`);

          // 基本資料
          this.roadArr.push({
            index: i + 1,
            road: `${Object.keys(e)[0]} ${Object.values(e)[0]['road_name']}`,
            each_road: road_drive_dir,
            each_dir: dir_index,
          })

          // 左側資訊區塊
          this.left_test_arr.push({
            each_road: Object.values(e)[0]['each_road'], // 路段
            each_dir: Object.values(e)[0]['each_dir'], // 方向
          })

          // 右側編輯區塊
          this.right_test_arr.push({
            each_road: road_drive_dir, // 路段
            each_dir: dir_index, // 方向
          })

          // 對應方向設定
          // 全部選項列表
          // this.bottom_test_arr.push([`A${i + 2}`, `B${i + 2}`, `C${i + 2}`, `D${i + 2}`]);
          // this.top_test_arr.push([`A${i}`, `B${i}`, `C${i}`, `D${i}`]);
          this.bottom_test_arr.push([`A${i}`, `B${i}`, `C${i}`, `D${i}`, `A${i + 2}`, `B${i + 2}`, `C${i + 2}`, `D${i + 2}`, '無對應方向']);
          this.top_test_arr.push([`A${i}`, `B${i}`, `C${i}`, `D${i}`, `A${i + 2}`, `B${i + 2}`, `C${i + 2}`, `D${i + 2}`, '無對應方向']);
          this.left_test_arr_2.push([`A${i}`, `B${i}`, `C${i}`, `D${i}`, `A${i + 2}`, `B${i + 2}`, `C${i + 2}`, `D${i + 2}`, '無對應方向']);
          this.right_test_arr_2.push([`A${i}`, `B${i}`, `C${i}`, `D${i}`, `A${i + 2}`, `B${i + 2}`, `C${i + 2}`, `D${i + 2}`, '無對應方向']);

          // 所選選項
          // 存取右側區塊選擇(隨使用者操作改變，用額外變數儲存)
          this.road_right.push(road_drive_dir.slice()[0]); // 路段
          this.dir_right.push('無對應方向'); // 左右預設都是無對應

          this.road_bottom.push(road_drive_dir.slice()[1]);
          if(this.directionSetting === '南北向') {
            this.dir_bottom.push(`D${i + 2}`);
          } else if (this.directionSetting === '東西向') {
            this.dir_bottom.push(`C${i + 2}`);
          }

          this.road_left.push(road_drive_dir.slice()[2]);
          this.dir_left.push('無對應方向'); // 左右預設都是無對應

          this.road_top.push(road_drive_dir.slice()[3]);
          if(this.directionSetting === '南北向') {
            this.dir_top.push(`B${i}`);
          } else if (this.directionSetting === '東西向') {
            this.dir_top.push(`A${i}`);
          }
        })

        // 預設結果
        this.selectResult = JSON.parse(JSON.stringify(this.roadArr)); // 待調整
      }
    })
  }

  ngOnInit(): void {
    // // 測試資料
    // let baaa = [];
    // this.directionSetting = '南北向'; // 測試
    // if(this.directionSetting === '南北向') {
    //   baaa = this.testDataNorth;
    // } else if(this.directionSetting === '東西向') {
    //   baaa = this.testDataWest;
    // }
    // // 取得的資料顯示於區塊(測試資料)
    // baaa.forEach((e, i) => {
    //   let road_drive_dir = Object.values(e)[0]['each_drive_dir'].map((item, index) => `${Object.values(e)[0]['each_road'][index]}${item}`);
    //   let dir_index = Object.values(e)[0]['each_dir'].map(item => `${item}${i + 1}`);

    //   // 基本資料
    //   this.roadArr.push({
    //     index: i + 1,
    //     road: `${Object.keys(e)[0]} ${Object.values(e)[0]['road_name']}`,
    //     each_road: road_drive_dir,
    //     each_dir: dir_index,
    //   })

    //   // 左側資訊區塊
    //   this.left_test_arr.push({
    //     each_road: Object.values(e)[0]['each_road'], // 路段
    //     each_dir: Object.values(e)[0]['each_dir'], // 方向
    //   })

    //   // 右側編輯區塊
    //   this.right_test_arr.push({
    //     each_road: road_drive_dir, // 路段
    //     each_dir: dir_index, // 方向
    //   })

    //   // 對應方向設定
    //   // 全部選項列表
    //   this.bottom_test_arr.push([`A${i}`, `B${i}`, `C${i}`, `D${i}`, `A${i + 2}`, `B${i + 2}`, `C${i + 2}`, `D${i + 2}`, '無對應方向']);
    //   this.top_test_arr.push([`A${i}`, `B${i}`, `C${i}`, `D${i}`, `A${i + 2}`, `B${i + 2}`, `C${i + 2}`, `D${i + 2}`, '無對應方向']);
    //   this.left_test_arr_baaa.push([`A${i}`, `B${i}`, `C${i}`, `D${i}`, `A${i + 2}`, `B${i + 2}`, `C${i + 2}`, `D${i + 2}`, '無對應方向']);
    //   this.right_test_arr_baaa.push([`A${i}`, `B${i}`, `C${i}`, `D${i}`, `A${i + 2}`, `B${i + 2}`, `C${i + 2}`, `D${i + 2}`, '無對應方向']);

    //   // 所選選項
    //   // 存取右側區塊選擇(隨使用者操作改變，用額外變數儲存)
    //   this.road_right.push(road_drive_dir.slice()[0]);
    //   this.dir_right.push('無對應方向'); // 左右預設都是無對應

    //   this.road_bottom.push(road_drive_dir.slice()[1]);
    //   if(this.directionSetting === '南北向') {
    //     this.dir_bottom.push(`D${i + 2}`);
    //   } else if (this.directionSetting === '東西向') {
    //     this.dir_bottom.push(`C${i + 2}`);
    //   }

    //   this.road_left.push(road_drive_dir.slice()[2]);
    //   this.dir_left.push('無對應方向'); // 左右預設都是無對應

    //   this.road_top.push(road_drive_dir.slice()[3]);
    //   if(this.directionSetting === '南北向') {
    //     this.dir_top.push(`B${i}`);
    //   } else if (this.directionSetting === '東西向') {
    //     this.dir_top.push(`A${i}`);
    //   }
    // })

    // // 預設結果
    // this.selectResult = JSON.parse(JSON.stringify(this.roadArr)); // 待調整
  }

  selectChange(section, type, value, road) {
    // console.log(`區塊: ${section}, 類型: ${type}, 選擇: ${value}, 整筆: ${road['road']}`);
    //              區塊: right,      類型: road,    選擇: 延平路往西, 整筆: TC034 經國路二段與延平路一段路口

    // 更新panel與回傳的資料
    this.selectResult = this.selectResult.map(e => {
      if(e['road'] === road['road']) {
        if(section === 'right') {
          if(type === 'road') {
            this.road_right[road['index'] - 1] = value;
            e['each_road'][0] = value;
          } else if(type === 'dir') {
            this.dir_right[road['index'] - 1] = value;
            e['each_dir'][0] = value;
          }
        } else if(section === 'bottom') {
          if(type === 'road') {
            this.road_bottom[road['index'] - 1] = value;
            e['each_road'][1] = value;
          } else if(type === 'dir') {
            this.dir_bottom[road['index'] - 1] = value;
            e['each_dir'][1] = value;
          }
        } else if(section === 'left') {
          if(type === 'road') {
            this.road_left[road['index'] - 1] = value;
            e['each_road'][2] = value;
          } else if(type === 'dir') {
            this.dir_left[road['index'] - 1] = value;
            e['each_dir'][2] = value;
          }
        } else if(section === 'top') {
          if(type === 'road') {
            this.road_top[road['index'] - 1] = value;
            e['each_road'][3] = value;
          } else if(type === 'dir') {
            this.dir_top[road['index'] - 1] = value;
            e['each_dir'][3] = value;
          }
        }
      }
      return e;
    })
  }

  close() {
    this.panel.close();
  }

  // 切頁
  goNext() {
    this.selectEditStep = 'result';

    // 傳送訊息顯示對應頁面元件
    this.centerService.editSelect$.next({
      selectEditStep: 'result',
      selectData: this.selectResult,
      direction: this.directionSetting,
      check: this.checkSetting,
      order: this.order,
      selectDate: this.selectDate
    })

  }

  // 東西向測試資料
  testDataWest = [
    {
      "TC034": {
        "road_name": "經國路二段與延平路一段路口",
        "each_road": [
          "經國路",
          "延平路",
          "經國路",
          "延平路"
        ],
        "each_dir": [
          "D",
          "A",
          "B",
          "C"
        ],
        "each_drive_dir": [
          "往南",
          "往西",
          "往北",
          "往東"
        ],
        "standard": true
      }
    },
    {
      "TC048": {
        "road_name": "延平路一段與117巷及民富街路口",
        "each_road": [
          "民富街",
          "延平路",
          "民富街",
          "延平路"
        ],
        "each_dir": [
          "D",
          "A",
          "B",
          "C"
        ],
        "each_drive_dir": [
          "往南",
          "往西",
          "往北",
          "往東"
        ],
        "standard": false
      }
    },
    // {
    //   "TC095": {
    //     "road_name": "北大路與延平路口",
    //     "each_road": [
    //       "北大路",
    //       "延平路",
    //       "北大路",
    //       "延平路"
    //     ],
    //     "each_dir": [
    //       "D",
    //       "A",
    //       "B",
    //       "C"
    //     ],
    //     "each_drive_dir": [
    //       "往南",
    //       "往西",
    //       "往北",
    //       "往東"
    //     ],
    //     "standard": false
    //   }
    // }
  ]


  // 南北向測試資料
  testDataNorth = [
    {
      "TC034": {
        "road_name": "經國路二段與延平路一段路口",
        "each_road": [
          "延平路",
          "經國路",
          "延平路",
          "經國路"
        ],
        "each_dir": [
          "A",
          "B",
          "C",
          "D"
        ],
        "each_drive_dir": [
          "往西",
          "往北",
          "往東",
          "往南"
        ],
        "standard": false
      }
    },
    {
      "TC371": {
        "road_name": "經國路二段與北新路",
        "each_road": [
          "北新路",
          "經國路",
          "北新路",
          "經國路"
        ],
        "each_dir": [
          "A",
          "B",
          "C",
          "D"
        ],
        "each_drive_dir": [
          "往西",
          "往北",
          "往東",
          "往南"
        ],
        "standard": false
      }
    },
    {
      "TC033": {
        "road_name": "經國路三段與中和路口",
        "each_road": [
          "中和路",
          "經國路",
          "中和路",
          "經國路"
        ],
        "each_dir": [
          "A",
          "B",
          "C",
          "D"
        ],
        "each_drive_dir": [
          "往西",
          "往北",
          "往東",
          "往南"
        ],
        "standard": true
      }
    }
  ]
}
