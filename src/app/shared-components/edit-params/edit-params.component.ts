import { Component, OnInit } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { CenterService } from 'src/app/pages/center.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/pages/auth/services';

@Component({
  selector: 'app-edit-params',
  templateUrl: './edit-params.component.html',
  styleUrls: ['./edit-params.component.scss']
})
export class EditParamsComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  selectEditStep: string = '';
  displayedColumns = [];
  dataSource = [];
  dataSave = []; // 儲存最初始資訊
  originData = [];
  roadName = {};
  allDirection = [];
  allRoadType: string[] = []; // 道路分類
  isSeparate: string[] = ['有', '無']; // 道路分隔
  laneNum: number[] = Array.from({ length: 12 }, (_, i) => i + 1);; // 車道數
  panelOpen1 = [];
  panelOpen2 = [];
  panelOpen3 = [];
  editAlready = [];

  constructor(
    private centerService: CenterService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
  ) {
    // 編輯步驟選擇
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.selectEditStep = res['selectEditStep'];
        if(this.selectEditStep === 'params') {
          // this.centerService.tc_id = 'TC048'; // 開發用
          this.getData();
        } else {
          // 離開頁面時清空表格資料
          this.dataSource.length = 0;
          this.dataSave.length = 0;
        }
      })

    // 儲存/取消結果
    this.centerService.saveResult$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res['editStep'] === 'params') {
          this.saveOrCancelRes(res['status']);
        }
      })

    // 切頁防呆判斷
    this.centerService.isEditing$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res['step'] !== 'params') {
          if(JSON.stringify(this.dataSource) !== JSON.stringify(this.dataSave)) {
            this.centerService.isEditing = true;
            this.remind('請先儲存或取消編輯內容', 'red', false);
          }
        }
    })
  }

  ngOnInit(): void {}

  // 取得參數設定資料並轉成表格格式
  getData() {
    this.centerService.get(`/api/turning/search/road_param/${this.centerService.tc_id}`).subscribe((res) => {
      this.editAlready.length = 0; // 清除之前紀錄
      this.originData = res['data']['setting'];
      this.allDirection = res['data']['setting'].map(e => e['direction']);
      this.allRoadType = res['data']['all_road_type'];
      this.displayedColumns = ['index'];
      this.dataSource = [{index: '道路分類'}, {index: '道路分隔'}, {index: '車道數'}, {index: '建議道路容量'}, {index: '道路容量'}];
      this.originData.forEach((e) => {
        this.panelOpen1.push(false);
        this.panelOpen2.push(false);
        this.panelOpen3.push(false);

        this.editAlready.push({
          direction: e['direction'],
          edit: e.capacity === -99 ? false : true // -99: 首次編輯
        })

        this.displayedColumns.push(e['direction']);
        this.roadName[e['direction']] = `(${e['direction']}) ${e['road_name']}`;
        this.dataSource[0][e.direction] = e.road_type; // 道路分類
        this.dataSource[1][e.direction] = e.is_separate; // 道路分隔
        this.dataSource[2][e.direction] = e.lane_num; // 車道路
        this.dataSource[3][e.direction] = e.ref_capacity ? e.ref_capacity : ''; // 建議道路容量
        this.dataSource[4][e.direction] = e.capacity; // 道路容量
      })

      this.dataSave = JSON.parse(JSON.stringify(this.dataSource)); // 存取最開始的資訊
    })
  }

  // 儲存/取消編輯內容
  saveOrCancelRes(status) {
    this.centerService.isEditing = false;
    if(status === 'save') {
      this.centerService.test$.next({
        first: false,
        change: {page: 'p2', status: true}
      })
      // 設定之後傳回後端的基本格式
      let dataSourceChange = {};
      this.dataSource.forEach((e => {
        dataSourceChange[e['index']] = e;
      }))

      // 檢查是否有欄位未填寫
      let allContent = [];
      this.dataSource.forEach((e) => {
        allContent.push(...Object.values(e));
      })
      let missData = allContent.some(e => e === '' || e === null);

      // 檢查道路容量是否有不合的數值
      let errCapacity = Object.values(this.dataSource[4]).some((e: any) => e < 0);

      if(!missData && !errCapacity) {
        // 將資料從表格轉成後端格式
        let settingData = [];
        this.originData.forEach((e) => {
          settingData.push({
            direction: e['direction'],
            road_name: e['road_name'],
            road_type: dataSourceChange['道路分類'][e['direction']],
            is_separate: dataSourceChange['道路分隔'][e['direction']],
            lane_num: dataSourceChange['車道數'][e['direction']],
            capacity: dataSourceChange['道路容量'][e['direction']],
            ref_capacity: dataSourceChange['建議道路容量'][e['direction']],
            edit_already: true
          })
        })

        // 避免儲存後直接繼續改時有誤
        this.editAlready = this.editAlready.map(e => {
          e['edit'] = true;
          return e;
        })

        let sendData = {
          setting: settingData
        }

        let req_body = {
          tc_id: this.centerService.tc_id,
          road_param: JSON.stringify(sendData)
        }

        this.centerService.post('/api/turning/update', req_body).subscribe({
          next: (res) => {
            this.remind('儲存成功', 'green', true);
            this.dataSave = JSON.parse(JSON.stringify(this.dataSource)); // 更新初始資料
            this.centerService.changeTCIcon$.next(true); // 檢查是否需要更改icon顏色
          },
          error: (err) => {
            console.log(err);
          }
        })
      } else if(missData) {
        this.remind('所有欄位均須填寫才能儲存', 'red', false);
      } else if(errCapacity) {
        this.remind('道路容量不可為負數', 'red', false);
      }
    } else if(status === 'cancel') {
      this.remind('取消編輯', 'green', true);
      this.getData(); // 回復原設定
    }
  }

  // 偵測下拉選單內容
  hasSelectValue(element, direction, type, idx) {
    if(element['index'] === '道路分類') {
      this.panelOpen1[idx] = false;
    } else if(element['index'] === '道路分隔') {
      this.panelOpen2[idx] = false;
    } else if(element['index'] === '車道數') {
      this.panelOpen3[idx] = false;
    }

    // 更新資料
    this.dataSource = this.dataSource.map((e) => {
      if(e['index'] === element['index']) {
        e[direction] = type;
      }
      return e;
    })
    this.getRefCapacity(direction); // 重新計算容量
  }

  // 偵測input內容
  hasInputValue(element, direction) {
    this.editAlready = this.editAlready.map(e => {
      if(e['direction'] === direction) {
        e['edit'] = true;
      }
      return e;
    })

    // 更新資料
    this.dataSource = this.dataSource.map((e) => {
      if(e['index'] === element['index']) {
        e = element;
      }
      return e;
    })
  }

  // 取得建議道路容量
  getRefCapacity(direction) {
    let dataSourceSave = this.dataSource.slice();
    let eachData = dataSourceSave.map((e) => e[direction]);

    // 取得建議道路容量
    let req_body = {
      direction: direction,
      road_type: eachData[0],
      is_separate: eachData[1] === '有' ? true : false,
      lane_num: eachData[2],
    }

    // 道路分類/道路分隔/車道數都有內容時才打API查表
    if(this.allRoadType.includes(eachData[0]) && this.isSeparate.includes(eachData[1]) && (eachData[2] >= 1 && eachData[2] <= 12)) {
      this.centerService.post('/api/turning/get_ref_volume', req_body).subscribe((res) => {
        // 更新建議道路容量資料
        let refVolumeData = dataSourceSave.filter((e) => e['index'] === '建議道路容量')[0];
        refVolumeData[res['data']['direction']] = res['data']['ref_volume'] === -999 ? '無資料' : res['data']['ref_volume'];

        // 更新道路容量資料 => 第一次設定時才連動
        let refVolumeData2 = dataSourceSave.filter((e) => e['index'] === '道路容量')[0];
        let editRes = this.editAlready.filter(e => e.direction === direction)[0];

        if(!editRes['edit']) {
          refVolumeData2[res['data']['direction']] = res['data']['ref_volume'] === -999 ? null : res['data']['ref_volume'];
        }
      })
    }
  }

  // slider
  clickBtn(type) {}

  // 建議道路容量欄位顏色設定
  capacityColor(type) {
    if(type === '建議道路容量') {
      return 'capacity-color';
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

  // 欄位解說內容
  display_info: any = {
    '道路分類': `高度干擾指道路兩旁土地使用型態以商業使用為主，或道路兩側違規停車問題嚴重，或路段長度小於 300 公尺。 \n
中度干擾指兩旁土地使用以非商業使用為主，或道路兩側無違規停車問題，或路段長度介於 300 至 600 公尺。 \n
若非以上兩類則屬於低度干擾道路。`,
    '道路分隔': `道路分隔係指道路是否具備有中央分隔或快慢分隔。`,
    '車道數': `車道數係指進入路口方向之路段車道數量，請填入整數1~12。`,
    '道路容量': `請依據建議道路容量填入容量值，或依據實際情形酌於調整道路容量後填入。`
  }

  // 選取道路分類&道路分隔
  selectRoadType(element, direction, dataType, dirIdx) {
    element[direction] = dataType;
    let newRes = element;

    // 更新資料
    this.dataSource = this.dataSource.map(e => {
      if(e['index'] === element['index']) {
        e = newRes;
      }
      return e;
    })
    this.getRefCapacity(direction); // 重新計算容量
  }
}

// // 格式
// dataSource = [
//   {
//     "index": "道路分類",
//     "A": "地區型道路-高度干擾",
//     "B": "地區型道路-中度干擾",
//     "C": "地區型道路-高度干擾",
//     "D": "地區型道路-中度干擾"
//   },
//   {
//     "index": "道路分隔",
//     "A": "有",
//     "B": "無",
//     "C": "有",
//     "D": "無"
//   },
//   {
//     "index": "車道數",
//     "A": 2,
//     "B": 1,
//     "C": 2,
//     "D": 1
//   },
//   {
//     "index": "建議道路容量",
//     "A": 1750,
//     "B": 950,
//     "C": 1750,
//     "D": 950
//   },
//   {
//     "index": "道路容量",
//     "A": 1600,
//     "B": 950,
//     "C": 1200,
//     "D": 1000
//   }
// ]
