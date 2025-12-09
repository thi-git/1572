import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { ViewChild, Component, OnInit, ElementRef } from '@angular/core';
import { CenterService } from 'src/app/pages/center.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-quality-result',
  templateUrl: './quality-result.component.html',
  styleUrls: ['./quality-result.component.scss']
})
export class QualityResultComponent implements OnInit {
  @ViewChild('modalContent', { static: false }) modalContent: ElementRef;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  selectEditStep = '';

  // 篩選參數
  singleDate;
  singleTime = ['07:00', '09:00'];

  // 左側區塊(順向)
  roadArr = [];

  // 各數值 => 左直右&總計
  value_right = [];
  value_bottom = [];
  value_left = [];
  value_top = [];

  // 右側區塊(反向)
  // roadArrOpp = [];

  // 各數值(反向) => 左直右&總計
  value_right_opp = [];
  value_bottom_opp = [];
  value_left_opp = [];
  value_top_opp = [];

  left_test_arr = []; // 基本資料設定
  resultData = []; // 取得最終檢核資料
  diff_result = []; // 差異比較
  diff_result_opp = []; // 差異比較(反向)
  directionSetting = ''; // 東西向/南北向
  checkSetting = ''
  order = [];

  turningTime = {}; // 紀錄每個路口被使用者轉方向設定的次數
  userDiffTemp = 10000; // 暫存
  userDiff = 10000;

  constructor(
    private centerService: CenterService,
    private snackBar: MatSnackBar
  ) {
    this.centerService.editSelect$
    .pipe(takeUntil(this.destroyed$))
    .subscribe(res => {
      this.selectEditStep = res['selectEditStep'];
      this.directionSetting = res['direction'];
      this.checkSetting = res['check'];
      this.order = res['order'];
      this.singleDate = res['selectDate'];

      // 正式資料
      if(typeof res['selectData'] !== 'undefined') {
        this.roadArr = res['selectData'];

        // 取得的資料顯示於區塊
        this.roadArr.forEach((e, i) => {
          // 基本設定
          this.left_test_arr.push({
            each_road: e['each_road'], // 路段
            each_dir: e['each_dir'], // 方向
          })

          // 判斷各路口轉的情況
          let startDir = e['each_road'][0].slice(-1);
          let types = {}
          if(this.directionSetting === '南北向') {
            types = {'西': 0, '北': 1, '東': 2, '南': 3}
          } else if(this.directionSetting === '東西向') {
            types = {'南': 0, '西': 1, '北': 2, '東': 3}
          }
          this.turningTime[e['road'].split(' ')[0]] = types[startDir];
        })
      }

      this.centerService.sendResultReq$.subscribe((res) => {
        // if(typeof res['req_date'] !== 'undefined') {
        //   this.singleDate = res['req_date'];
        // }
        if(typeof res['req_time'] !== 'undefined') {
          this.singleTime = res['req_time'];
        }
        if(typeof res['req_diff'] !== 'undefined') {
          this.userDiffTemp = res['req_diff'];
        }
      })
    })
  }

  ngOnInit(): void {
    // // 測試資料
    // this.directionSetting = '南北向'; // 測試
    // if(this.directionSetting === '南北向') {
    //   // this.roadArr = this.roadArrNorth;

    //   // TC089和TC304的路口轉向測試資料
    //   this.roadArr = this.testTurning;

    // } else if(this.directionSetting === '東西向') {
    //   this.roadArr = this.roadArrWest;
    // }

    // // 取得的資料顯示於區塊
    // this.roadArr.forEach((e, i) => {
    //   // 基本設定
    //   this.left_test_arr.push({
    //     each_road: e['each_road'], // 路段
    //     each_dir: e['each_dir'], // 方向
    //   })
    // })
  }

  // 取得資料
  getData() {
    if(typeof this.singleDate === 'undefined') {
      this.remind('請選擇資料日期', 'red', false);
    } else if(typeof this.singleTime === 'undefined') {
      this.remind('請選擇檢核時段', 'red', false);
    } else if(this.userDiffTemp === 10000) {
      this.remind('請填寫差異百分比', 'red', false);
    } else if(this.userDiffTemp > 100 || this.userDiffTemp < 0) {
    this.remind('差異百分比須填寫0~100間之數值', 'red', false);
    } else {
      // 時間設定
      let transformedTimes = this.singleTime.map(time => {
        if(time === '00:00') {
          return 0;
        } else if(time === '00:15') {
          return 15;
        } else if(time === '00:30') {
          return 30;
        } else if(time === '00:45') {
          return 45;
        } else {
          return Number(time.replace(':', '').replace(/^0/, ''));
        }
      });

      // 參數設定
      let req_body = {
        "tc_id": this.order,
        "calc_type": this.checkSetting === '車流量' ? 0 : 1,
        "calc_date": this.singleDate,
        "calc_period": transformedTimes,
        "order": this.order
      }

      // 開發用
      // let req_body = {
      //   "tc_id": ['TC089', 'TC304'],
      //   "calc_type": 0,
      //   "calc_date": this.singleDate,
      //   "calc_period": transformedTimes,
      //   "order": ['TC089', 'TC304'],
      // }

      this.centerService.post('/api/quality/get_all_result', req_body).subscribe(res => {
        // 清空所有資料
        this.value_right.length = 0;
        this.value_bottom.length = 0;
        this.value_left.length = 0;
        this.value_top.length = 0;
        this.value_right_opp.length = 0;
        this.value_bottom_opp.length = 0;
        this.value_left_opp.length = 0;
        this.value_top_opp.length = 0;
        this.diff_result.length = 0;
        this.diff_result_opp.length = 0;
        this.resultData = [];
        this.userDiff = this.userDiffTemp;

        // 進行每個路口的資料方向轉換(0=>不用轉換 不是0=>依照次數轉換)
        res['data'].forEach(k => {
          // 逆1: D=>A  A=>B  B=>C  C=>D  (後端xx值變前端xx方向)
          // 逆2: D=>B  A=>C  B=>D  C=>A
          // 逆3: D=>C  A=>D  B=>A  C=>B
          let tc_id = Object.keys(k)[0];
          let turnTime = this.turningTime[tc_id];
          if(turnTime === 0) { // 原方向
            this.resultData.push(k)
          } else if(turnTime === 1) {  // 逆轉1
            this.resultData.push({
              [tc_id]: {
                road_name: k[tc_id]['road_name'],
                A: k[tc_id]['B'],
                B: k[tc_id]['C'],
                C: k[tc_id]['D'],
                D: k[tc_id]['A'],
              }
            })
          } else if(turnTime === 2) {  // 逆轉2
            this.resultData.push({
              [tc_id]: {
                road_name: k[tc_id]['road_name'],
                A: k[tc_id]['C'],
                B: k[tc_id]['D'],
                C: k[tc_id]['A'],
                D: k[tc_id]['B'],
              }
            })
          } else if(turnTime === 3) {  // 逆轉3
            this.resultData.push({
              [tc_id]: {
                road_name: k[tc_id]['road_name'],
                A: k[tc_id]['D'],
                B: k[tc_id]['A'],
                C: k[tc_id]['B'],
                D: k[tc_id]['C'],
              }
            })
          }
        })

        if(this.directionSetting === '南北向') {
          this.resultData.forEach((e, i) => {
            // 順向設定
            this.value_right.push({
              left: Object.values(e)[0]['A']['left'],
              front: Object.values(e)[0]['A']['front'],
              right: Object.values(e)[0]['A']['right'],
              total: Object.values(e)[0]['A']['total'],
            });
            // 順向不讀bottom區塊轉向量
            this.value_bottom.push({
              left: Object.values(e)[0]['C']['right'],
              front: Object.values(e)[0]['D']['front'],
              right: Object.values(e)[0]['A']['left'],
              total: Object.values(e)[0]['C']['right'] +
                     Object.values(e)[0]['D']['front'] +
                     Object.values(e)[0]['A']['left'],
            });
            this.value_left.push({
              left: Object.values(e)[0]['C']['left'],
              front: Object.values(e)[0]['C']['front'],
              right: Object.values(e)[0]['C']['right'],
              total: Object.values(e)[0]['C']['total'],
            });
            this.value_top.push({
              left: Object.values(e)[0]['D']['left'],
              front: Object.values(e)[0]['D']['front'],
              right: Object.values(e)[0]['D']['right'],
              total: Object.values(e)[0]['D']['total'],
            });

            // 反向設定
            this.value_right_opp.push({
              left: Object.values(e)[0]['A']['left'],
              front: Object.values(e)[0]['A']['front'],
              right: Object.values(e)[0]['A']['right'],
              total: Object.values(e)[0]['A']['total'],
            });
            this.value_bottom_opp.push({
              left: Object.values(e)[0]['B']['left'],
              front: Object.values(e)[0]['B']['front'],
              right: Object.values(e)[0]['B']['right'],
              total: Object.values(e)[0]['B']['total'],
            });
            this.value_left_opp.push({
              left: Object.values(e)[0]['C']['left'],
              front: Object.values(e)[0]['C']['front'],
              right: Object.values(e)[0]['C']['right'],
              total: Object.values(e)[0]['C']['total'],
            });
            // 反向不讀top區塊轉向量
            this.value_top_opp.push({
              left: Object.values(e)[0]['A']['right'],
              front: Object.values(e)[0]['B']['front'],
              right: Object.values(e)[0]['C']['left'],
              total: Object.values(e)[0]['A']['right'] +
                     Object.values(e)[0]['B']['front'] +
                     Object.values(e)[0]['C']['left'],
            });
          })
        } else if(this.directionSetting === '東西向') {
          this.resultData.forEach((e, i) => {
            // 順向設定
            this.value_right.push({
              left: Object.values(e)[0]['D']['left'],
              front: Object.values(e)[0]['D']['front'],
              right: Object.values(e)[0]['D']['right'],
              total: Object.values(e)[0]['D']['total'],
            });
            // 順向不讀bottom區塊轉向量
            this.value_bottom.push({
              left: Object.values(e)[0]['B']['right'],
              front: Object.values(e)[0]['C']['front'],
              right: Object.values(e)[0]['D']['left'],
              total: Object.values(e)[0]['B']['right'] +
                     Object.values(e)[0]['C']['front'] +
                     Object.values(e)[0]['D']['left'],
            });
            this.value_left.push({
              left: Object.values(e)[0]['B']['left'],
              front: Object.values(e)[0]['B']['front'],
              right: Object.values(e)[0]['B']['right'],
              total: Object.values(e)[0]['B']['total'],
            });
            this.value_top.push({
              left: Object.values(e)[0]['C']['left'],
              front: Object.values(e)[0]['C']['front'],
              right: Object.values(e)[0]['C']['right'],
              total: Object.values(e)[0]['C']['total'],
            });

            // 反向設定
            this.value_right_opp.push({
              left: Object.values(e)[0]['D']['left'],
              front: Object.values(e)[0]['D']['front'],
              right: Object.values(e)[0]['D']['right'],
              total: Object.values(e)[0]['D']['total'],
            });
            this.value_bottom_opp.push({
              left: Object.values(e)[0]['A']['left'],
              front: Object.values(e)[0]['A']['front'],
              right: Object.values(e)[0]['A']['right'],
              total: Object.values(e)[0]['A']['total'],
            });
            this.value_left_opp.push({
              left: Object.values(e)[0]['B']['left'],
              front: Object.values(e)[0]['B']['front'],
              right: Object.values(e)[0]['B']['right'],
              total: Object.values(e)[0]['B']['total'],
            });
            // 反向不讀top區塊轉向量
            this.value_top_opp.push({
              left: Object.values(e)[0]['D']['right'],
              front: Object.values(e)[0]['A']['front'],
              right: Object.values(e)[0]['B']['left'],
              total: Object.values(e)[0]['D']['right'] +
                     Object.values(e)[0]['A']['front'] +
                     Object.values(e)[0]['B']['left'],
            });
          })
        }

        // 差異百分比計算
        this.value_top.forEach((e, i) => {
          if(i > 0) {
            if((e['total'] + this.value_bottom[i - 1]['total']) === 0) {
              this.diff_result.push(0);
            } else {
              let temp = (Math.abs(e['total'] - this.value_bottom[i - 1]['total']) / ((e['total'] + this.value_bottom[i - 1]['total']) / 2)) * 100;
              this.diff_result.push(Math.round(temp * 10) / 10);
            }
          }
        })

        this.value_top_opp.forEach((e, i) => {
          if(i > 0) {
            if((this.value_bottom_opp[i - 1]['total'] + e['total']) === 0) {
              this.diff_result_opp.push(0);
            } else {
              let temp = (Math.abs(this.value_bottom_opp[i - 1]['total'] - e['total']) / ((this.value_bottom_opp[i - 1]['total'] + e['total']) / 2)) * 100;
              this.diff_result_opp.push(Math.round(temp * 10) / 10);
            }

          }
        })
      })
    }
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

  download() {
    const element = this.modalContent.nativeElement;
    const originalHeight = element.style.height; // 原始高度
    element.style.height = 'auto'; // 設置高度為全部高度
    html2canvas(element, { scrollX: 0, scrollY: 0 }).then(canvas => {
      const img = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = img;
      link.download = '檢核結果.png';
      link.click();
      // 恢復原始高度
      element.style.height = originalHeight; // 待調整
    });
  }

  // 東西向測試資料
  roadArrWest =  [
    {
        "index": 1,
        "road": "TC034 經國路二段與延平路一段路口",
        "each_road": [
            "經國路往南",
            "延平路往西",
            "經國路往北",
            "延平路往東"
        ],
        "each_dir": [
            "D1",
            "A1",
            "B1",
            "C1"
        ]
    },
    {
        "index": 2,
        "road": "TC048 延平路一段與117巷及民富街路口",
        "each_road": [
            "民富街往南",
            "延平路往西",
            "民富街往北",
            "延平路往東"
        ],
        "each_dir": [
            "D2",
            "A2",
            "B2",
            "C2"
        ]
    },
    // {
    //     "index": 3,
    //     "road": "TC095 北大路與延平路口",
    //     "each_road": [
    //         "北大路往南",
    //         "延平路往西",
    //         "北大路往北",
    //         "延平路往東"
    //     ],
    //     "each_dir": [
    //         "D3",
    //         "A3",
    //         "B3",
    //         "C3"
    //     ]
    // }
  ]

  // 南北向測試資料
  roadArrNorth = [
    {
        "index": 1,
        "road": "TC034 經國路二段與延平路一段路口",
        "each_road": [
            "延平路往西",
            "經國路往北",
            "延平路往東",
            "經國路往南"
        ],
        "each_dir": [
            "A1",
            "B1",
            "C1",
            "D1"
        ]
    },
    {
        "index": 2,
        "road": "TC371 經國路二段與北新路",
        "each_road": [
            "北新路往西",
            "經國路往北",
            "北新路往東",
            "經國路往南"
        ],
        "each_dir": [
            "A2",
            "B2",
            "C2",
            "D2"
        ]
    },
    {
        "index": 3,
        "road": "TC033 經國路三段與中和路口",
        "each_road": [
            "中和路往西",
            "經國路往北",
            "中和路往東",
            "經國路往南"
        ],
        "each_dir": [
            "A3",
            "B3",
            "C3",
            "D3"
        ]
    }
  ]

  // TC089/TC304轉向測試資料
  testTurning = [
    {
        "index": 1,
        "road": "TC089 西大路與民富街路口",
        "each_road": [
            "西大路往南",
            "民富街往西",
            "西大路往北",
            "民富街往東"
        ],
        "each_dir": [
            "A1",
            "B1",
            "C1",
            "D1"
        ]
    },
    {
        "index": 2,
        "road": "TC304 民富街與少年街口",
        "each_road": [
            "少年街往西",
            "民富街往北",
            "少年街往東",
            "民富街往南"
        ],
        "each_dir": [
            "A2",
            "B2",
            "C2",
            "D2"
        ]
    }
  ]
}





