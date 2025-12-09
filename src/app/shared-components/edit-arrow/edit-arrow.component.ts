import { Component, OnInit, NgZone } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { CenterService } from 'src/app/pages/center.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/pages/auth/services';

@Component({
  selector: 'app-edit-arrow',
  templateUrl: './edit-arrow.component.html',
  styleUrls: ['./edit-arrow.component.scss']
})
export class EditArrowComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  selectEditStep: string = '';
  tc_id: string = '';
  intersectionName: string = '';
  intersectionType: string = '';

  // 道路群組
  addRoadGroup: boolean = false; // 點選新增群組
  addRoadGroupName: string = ''; // 新增的名稱
  roadGroupArr = []; // 群組列表
  roadGroupArrTest = []; // 儲存最初始資訊(關鍵字搜尋)
  roadGroupArrSave = []; // 儲存最初始資訊(最終比對有無更新內容)
  selectedRoadGroupText = ''; // 顯示道路群組所選內容
  selectedRes = [];
  selectedCity = '';

  // 編輯路段
  haveSelectedRoad: boolean = false; // 點選編輯路段後顯示底下箭頭選單
  selectedData = {}; // 點選到的編輯路段的資料
  arrowSetting = []; //  點選到的編輯路段的箭頭設定

  // 所選內容名稱設定
  selectedRoadName = '請選擇路段名稱'; // 編輯路段
  selectedTypeName = []; // 選擇的箭頭方向
  allTypeName = []; // 箭頭方向列表

  // panel開合設定
  panelOpenGroup: boolean = false; // 道路群組
  panelOpenRoad: boolean = false; // 編輯路段
  panelOpenArr = [];

  arrowDataGroup = []; // 該路口所有箭頭資訊
  arrowDataGroupSave = []; // 儲存最初始資訊
  oldMarker = {}; // 儲存上一個點選的箭頭(用來判斷是否點到了下一個新marker)

  typeArr = []; // 不同panel css設定
  selectedValue = '';
  intersectionTestArr = [];

  constructor(
    private centerService: CenterService,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private authService: AuthService,
  ) {
    // 編輯步驟選擇
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.selectEditStep = res['selectEditStep'];
      })

    // 點擊TC marker後開啟編輯視窗
    this.centerService.editStatus$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.ngZone.run(() => {
          if(res['openEdit']) {
            this.tc_id = res['tc_id'];
            this.intersectionName = res['roadName'];
            this.intersectionType = res['intersectionType'];
            this.selectedCity = res['city'];
            this.arrowDataGroup = res['arrowDataGroup'];
            this.arrowDataGroupSave = JSON.parse(JSON.stringify(this.arrowDataGroup)); // 存取最開始的箭頭資訊

            // 取得所有道路群組資料
            this.centerService.post('/api/road_group/all', {city: res['city']}).subscribe({
              next: (back) => {
                back['data'].forEach((e) => {
                  this.roadGroupArr.push({
                    groupName: e,
                    is_enable: res['roadGroups'].includes(e) ? true : false
                  });
                })
                // 存取最開始的道路群組資訊
                this.roadGroupArrSave = JSON.parse(JSON.stringify(this.roadGroupArr));
                this.roadGroupArrTest = JSON.parse(JSON.stringify(this.roadGroupArr));

                let selectedGroup = this.roadGroupArr.filter(e => e['is_enable']).map(e => e['groupName']);
                this.selectedRes = selectedGroup;
                if(selectedGroup.length > 0) {
                  this.selectedRoadGroupText = selectedGroup.join(', ');
                } else {
                  this.selectedRoadGroupText = '請選擇道路群組';
                }
              },
              error: (err) => {
                console.log(err);
                if (err.error.msg === 'Token has expired') {
                  this.authService.signOut(); // token過期登出
                }
              }
            })
          } else {
            this.backToOriginSetting('back'); // 清空資料
          }
        })
      })

    // 地圖上直接點選箭頭進行編輯
    this.centerService.clickMarker$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.ngZone.run(() => {
          if(res['type'] === 'arrow') {
            let clickMarker = this.arrowDataGroup.filter((e) => e['markerDir'] === res['clickMarker'])[0];
            this.selectedValue = clickMarker['markerDir'];
            this.findMarkerMsg(clickMarker);
          }
        })
      })

    // 儲存/取消結果
    this.centerService.saveResult$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res['editStep'] === 'definition') {
          this.saveOrCancelRes(res['status']);
        }
      })

    // 切頁防呆判斷
    this.centerService.isEditing$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        if(res['step'] !== 'definition') {
          let arrowRes = JSON.stringify(this.arrowDataGroup) !== JSON.stringify(this.arrowDataGroupSave);
          let roadGroupRes = JSON.stringify(this.roadGroupArr) !== JSON.stringify(this.roadGroupArrSave);
          if(arrowRes || roadGroupRes) {
            this.centerService.isEditing = true;
            this.remind('請先儲存或取消編輯內容', 'red', false);
          }
        }
      })

    // 結束編輯清空資料
    this.centerService.backToStart$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.backToOriginSetting('back');
      })
  }

  ngOnInit(): void {
    // 視窗點擊偵測
    document.addEventListener('click', (e: any) => {
      let panel = document.getElementById('grouptest');
      if(panel !== null) {
        if (!panel.contains(e['target'])) {
          if(!this.addRoadGroup) {
            this.panelOpenGroup = false;
          }
        }
      }
    })
  }

  // 選擇編輯路段
  findMarkerMsg(data) {
    // 在變更路段選擇時，取得舊marker
    if(Object.keys(this.selectedData).length !== 0) {
      this.oldMarker = this.selectedData;
    }

    // 傳送訊息給地圖尋找marker&更改樣式
    if(data['markerDir'] !== this.oldMarker['markerDir']) {
      this.centerService.selectedRoadMarker$.next({
        data: data, // 目前選取的箭頭
        previous: this.oldMarker // 上一個選取的箭頭
      })
    }

    this.selectedData = data;
    this.selectedRoadName = `(${data['markerDir']}) ${data['eachRoad']}`;
    this.arrowSetting = data['arrowSetting'];
    this.setImage(); // 示意圖設定(待修改)

    // 底下選單箭頭方向設定(1.直行 2.右轉 3.左轉)
    this.allTypeName = this.arrowSetting.map(e => e['type']);
    this.allTypeName.push('無');
    this.selectedTypeName = this.arrowSetting.map(e => e['select_arrow_type']);

    // 設定panel和type(type為不同css設定)
    this.panelOpenArr = this.allTypeName.map((e) => false);
    this.typeArr = this.allTypeName.map((e, i) => `type${i}`);

    this.haveSelectedRoad = true;
    this.panelOpenRoad = false;
  }

  // 選擇箭頭轉向
  selectOption(arrowType, typeName, num) {
    this.panelOpenArr[num] = false;
    this.selectedTypeName[num] = typeName;
    this.selectedData['arrowSetting'] = this.selectedData['arrowSetting'].map((e) => {
      if(e['id'] === arrowType['id']) {
        e['select_arrow_type'] = typeName;
      }
      return e;
    })

    // 選擇轉向後傳給地圖
    this.centerService.selectedArrowDirection$.next({
      selectedId: arrowType['id'],
      selectedTypeName: typeName,
      selectedDirectionName: arrowType['direction_name'],
      markerDir: this.selectedData['markerDir']
    })

    // 更新資料
    this.arrowDataGroup = this.arrowDataGroup.map((e) => {
      if(e['markerDir'] === this.selectedData['markerDir']) {
        e = this.selectedData;
      }
      return e;
    })
  }

  // 儲存/取消編輯內容
  saveOrCancelRes(status) {
    // 恢復編輯中的marker樣式
    if(Object.keys(this.selectedData).length !== 0) {
      this.centerService.afterSaveOrCancel$.next({
        markerDir: this.selectedData['markerDir'],
        arrowSetting: this.selectedData['arrowSetting'],
      })
    }

    this.centerService.isEditing = false;
    if(status === 'save') {
      this.centerService.test$.next({
        first: false,
        change: {page: 'p1', status: true}
      })
      // 儲存資料到後端
      let saveNewData = [];
      this.arrowDataGroup.forEach((e) => {
        saveNewData.push({
          each_road: e['eachRoad'],
          marker_dir: e['markerDir'],
          origin_position: e['originPosition'],
          arrow_setting: e['arrowSetting']
        })
      })

      let sendData = {
        road_groups: this.selectedRes,
        turning_config: saveNewData
      }

      let req_body = {
        tc_id: this.tc_id,
        svg_detail: JSON.stringify(sendData)
      }

      this.centerService.post('/api/turning/update', req_body).subscribe({
        next: (res) => {
          this.remind('儲存成功', 'green', true);
          this.arrowDataGroupSave = JSON.parse(JSON.stringify(this.arrowDataGroup)); // 更新初始資料
          this.roadGroupArrSave = JSON.parse(JSON.stringify(this.roadGroupArr)); // 更新初始資料
          this.centerService.changeTCIcon$.next(true); // 檢查是否需要更改icon顏色
          this.backToOriginSetting('save'); // 清空資料
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
      this.backToOriginSetting('cancel'); // 清空資料
      this.centerService.getOldData$.next(true); // 在地圖重打一次API取得原本箭頭資料
    }
  }

  // 關鍵字搜尋
  selectData(event) {
    let searchWord = event['target']['value'];
    this.roadGroupArr = this.roadGroupArrTest.filter(data => data['groupName'].includes(searchWord));
  }

  // 新增道路群組
  addNewRoadGroup() {
    this.addRoadGroup = true;
  }

  // 儲存/取消新增的道路群組
  addRoadGroupRes(res) {
    let existGroupName = this.roadGroupArr.map(e => e['groupName']);
    if(res === 'save') {
      if(this.addRoadGroupName !== '') {
        if(!existGroupName.includes(this.addRoadGroupName)) {
          this.roadGroupArr.unshift({
            groupName: this.addRoadGroupName.trim(), // 過濾前後空白避免使用者打錯
            is_enable: false
          });
          // 更新資料
          this.roadGroupArrTest.unshift({
            groupName: this.addRoadGroupName.trim(), // 過濾前後空白避免使用者打錯
            is_enable: false
          });

          // 新增群組(之後看是寫在這裡或是透過存路口定義內容時再一起存群組)
          let req_body = {
            name: this.addRoadGroupName,
            city: this.selectedCity,
            active: true
          }
          this.centerService.post('/api/road_group/update', req_body).subscribe({
            next: (back) => {
              // this.remind('新增成功', 'green', true);
            },
            error: (err) => {
              console.log(err);
              if (err.error.msg === 'Token has expired') {
                this.authService.signOut(); // token過期登出
              }
            }
          })
        } else {
          this.remind('此群組名稱已存在，請輸入其他名稱', 'red', false);
        }
      } else {
        this.remind('群組名稱不得為空白', 'red', false);
      }
    }
    this.addRoadGroup = false;
    this.addRoadGroupName = '';
  }

  // 道路群組選單變更
  changeStatus(event, data) {
    if(event['checked']) {
      this.selectedRes.push(data);
      // 更新資料
      this.roadGroupArr = this.roadGroupArr.map(item => {
        if(item['groupName'] === data) item['is_enable'] = true;
        return item;
      })
      this.roadGroupArrTest = this.roadGroupArrTest.map(item => {
        if(item['groupName'] === data) item['is_enable'] = true;
        return item;
      })
    } else {
      this.selectedRes = this.selectedRes.filter(e => e !== data);
      // 更新資料
      this.roadGroupArr = this.roadGroupArr.map(item => {
        if(item['groupName'] === data) item['is_enable'] = false;
        return item;
      })
      this.roadGroupArrTest = this.roadGroupArrTest.map(item => {
        if(item['groupName'] === data) item['is_enable'] = false;
        return item;
      })
    }
    this.selectedRoadGroupText = this.selectedRes.join(', ');
    if(this.selectedRoadGroupText.length === 0) {
      this.selectedRoadGroupText = '請選擇道路群組';
    }
  }

  // 清空所有資料&恢復原始設定
  backToOriginSetting(status) {
    this.addRoadGroup = false;
    this.addRoadGroupName = '';
    this.haveSelectedRoad = false;
    this.selectedData = {};
    this.selectedRoadName = '請選擇路段名稱';
    this.selectedTypeName.length = 0;
    this.allTypeName.length = 0;
    this.panelOpenGroup = false;
    this.panelOpenRoad = false;
    this.panelOpenArr.length = 0;
    this.oldMarker = {};
    this.selectedValue = '';
    this.intersectionTestArr.length = 0;
    if(status === 'save') {
    } else if(status === 'cancel' || status === 'back') {
      this.roadGroupArr.length = 0;
      this.selectedRoadGroupText = '';
      this.selectedRes.length = 0;
      this.arrowSetting.length = 0;
      this.arrowDataGroup.length = 0;
      this.arrowDataGroupSave.length = 0;
    }
  }

  // 箭頭選單位置設定
  typeSetting(idx) {
    if(idx >= 0 && idx <= 3) {
      return 'type0';
    } else if(idx >= 4 && idx <= 7) {
      return 'type1';
    } else if(idx >= 8 && idx <= 11) {
      return 'type2';
    } else if(idx >= 12 && idx <= 15) {
      return 'type3';
    } else if(idx >= 16 && idx <= 19) {
      return 'type4';
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

  // 示意圖設定
  setImage() {
    let allIntersectionType = {
      three: ['上T型三叉路口', '下T型三叉路口', '左T型三叉路口', '右T型三叉路口'],
      four: ['正交四叉路口', '四叉路口'],
      five: ['五叉路口(一)', '五叉路口(二)', '五叉路口(三)'],
      six: ['六叉路口(一)', '六叉路口(二)', '六叉路口(三)', '六叉路口(四)', '六叉路口(五)'],
      k_type: ['K字路口(一)', 'K字路口(二)', 'K字路口(三)', 'K字路口(四)']
    }

    let getDirectionName = this.arrowSetting.map(e => e['direction_name']);
    if(allIntersectionType['four'].includes(this.intersectionType)) {
      getDirectionName.unshift(this.selectedData['markerDir']);
    } else if(this.intersectionType === '上T型三叉路口') {
      if(this.selectedData['markerDir'] === 'A') {
        getDirectionName = ['A', '', 'C', 'D'];
      } else if(this.selectedData['markerDir'] === 'C') {
        getDirectionName = ['C', 'D', 'A', ''];
      } else if(this.selectedData['markerDir'] === 'D') {
        getDirectionName = ['D', 'A', '', 'C'];
      }
    } else if(this.intersectionType === '右T型三叉路口') {
      if(this.selectedData['markerDir'] === 'A') {
        getDirectionName = ['A', 'B', '', 'D'];
      } else if(this.selectedData['markerDir'] === 'B') {
        getDirectionName = ['B', '', 'D', 'A'];
      } else if(this.selectedData['markerDir'] === 'D') {
        getDirectionName = ['D', 'A', 'B', ''];
      }
    } else if(this.intersectionType === '下T型三叉路口') {
      if(this.selectedData['markerDir'] === 'A') {
        getDirectionName = ['A', 'B', 'C', ''];
      } else if(this.selectedData['markerDir'] === 'B') {
        getDirectionName = ['B', 'C', '', 'A'];
      } else if(this.selectedData['markerDir'] === 'C') {
        getDirectionName = ['C', '', 'A', 'B'];
      }
    } else if(this.intersectionType === '左T型三叉路口') {
      if(this.selectedData['markerDir'] === 'B') {
        getDirectionName = ['B', 'C', 'D', ''];
      } else if(this.selectedData['markerDir'] === 'C') {
        getDirectionName = ['C', 'D', '', 'B'];
      } else if(this.selectedData['markerDir'] === 'D') {
        getDirectionName = ['D', '', 'B', 'C'];
      }
    } else if(this.intersectionType === 'K字路口(一)') {
      if(this.selectedData['markerDir'] === 'B') {
        getDirectionName = ['B', 'C', 'D', 'E'];
      } else if(this.selectedData['markerDir'] === 'C') {
        getDirectionName = ['C', 'D', 'E', 'B'];
      } else if(this.selectedData['markerDir'] === 'D') {
        getDirectionName = ['D', 'E', 'B', 'C'];
      } else if(this.selectedData['markerDir'] === 'E') {
        getDirectionName = ['E', 'B', 'C', 'D'];
      }
    }
    this.intersectionTestArr = getDirectionName;
  }
}
