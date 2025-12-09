import { Component, OnInit, Input } from '@angular/core';
import { CenterService } from '../../pages/center.service';
// import { AuthService } from 'src/app/pages/auth/services';
import { ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
// import * as moment from 'moment';
import { MatSnackBar } from '@angular/material/snack-bar';
// import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

interface DataItem {
  intersection_number: string;  // 路口編號
  intersection_name: string;    // 路口名稱
  district: string;             // 行政區
  city:string;                  // 縣市
  longitude: number;            // 路口經度
  latitude: number;             // 路口緯度
}

@Component({
  selector: 'app-list-road-form',
  templateUrl: './list-road-form.component.html',
  styleUrls: ['./list-road-form.component.scss']
})
export class ListRoadFormComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @Input() loading: boolean = false;
  // @Input() originData!: any[];
  @Input() listOfColumn: { title: string; value: string; width: string; }[];    // 欄位設定
  @Input() listOfData: any[];   // 資料設定
  @Input() showPagination: boolean = true;    // 顯示分頁
  @Input() pageSize: number = 10;   // 每頁可呈現的資料筆數
  @Input() pageIndex: number = 1;   // 顯示的頁數
  @Input() scrollY: string = 'calc(100vh - 420px)';
  @Input() scrollX: string = '1280';
  tableSize = 'default';
  selectSubpage: string = 'road';
  insertedList: any[];     // 暫存要新增的資料
  updatedList: any[];      // 暫存要更新的資料
  deletedList: any[];      // 暫存要刪除的資料
  original_listOfData: any[]    // 暫存最原始的資料 (剛回傳)
  currentEditingRow: string | null = null;  // 儲存現在正在編輯的那一行


  // 擷取當下時間
  getFormattedDate(): string {
    const today = new Date();
    const taiwanTimezoneOffset = 8 * 60;                                                // 台灣時區偏移量，以分鐘為單位
    const taiwanTimezoneOffsetMilliseconds = taiwanTimezoneOffset * 60 * 1000;          // 轉毫秒
    const taiwanTime = new Date(today.getTime() + taiwanTimezoneOffsetMilliseconds);    // 台灣時區
    const formattedDate = taiwanTime.toISOString().slice(0, 19).replace('T', ' ');      // 格式化YYYY-MM-DD HH:mm:ss
    return formattedDate;
  }

  constructor(
    private centerService: CenterService,
    // private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    // 子頁切換，資料清空
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.selectSubpage = res['selectSubpage'];
        if(this.selectSubpage !== 'road') {
          this.listOfData = [];
          this.insertedList = [];
          this.deletedList = [];
          this.updatedList = [];
        }
    });

    // 顯示表格資料
    this.centerService.roadUploadedData$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        // console.log(`一開始的編輯狀態為${this.centerService.isListEditing}`);
        this.pageIndex = 1;         // 回去第一頁
        this.insertedList = [];
        this.deletedList = [];
        this.updatedList = [];

        // 取得表格資料
        this.listOfData = res['road_uploaded_data'];
        this.original_listOfData = this.listOfData;           // 將一開始的資料暫存

        // 排列依據 (用更新時間排序，最新的在第一筆)
        this.listOfData.sort((a, b) => {
          const timeA = new Date(a.update_time).getTime();
          const timeB = new Date(b.update_time).getTime();
          return timeB - timeA;
        });
    });
  }

  ngOnInit(): void {
    // 設定欄位
    this.listOfColumn = [
      {title: '',value: 'edit_tc',width: '8px'},
      {title: '縣市',value: 'city',width: '8px'},
      {title: '路口編號',value: 'tc_id',width: '9px'},
      {title: '路口名稱',value: 'road',width: '35px'},
      {title: '行政區',value: 'district', width: '8px'},
      {title: '路口緯度',value: 'lat',width: '12px'},
      {title: '路口經度',value: 'lng',width: '12px'},
      {title: '更新時間',value: 'update_time',width: '12px'},
      {title: '編輯人員',value: 'last_editor',width: '8px'}
    ];

    document
    .getElementById('list-road-form')
    .addEventListener('click', (e) => {
      this.centerService.windowClick$.next(true);
    });

    // 取消編輯
    this.centerService.isCleanAll
    .pipe(takeUntil(this.destroyed$))
    .subscribe((isCleanAll) => {
      if (isCleanAll) {
        this.clearInputs();
      }
    });
  }

  // 提示訊息樣式設定
  remind(text: string, color: string, autoFade: boolean, confirmText: string = '了解', confirmCallback?: () => void, cancelText?: string, cancelCallback?: () => void) {
    let snackbarColor = '';
    let snackbarFade = 0;
    let disableClick = false;

    if (color === 'red') {
      snackbarColor = 'snack-bar-setting-red';
    } else if (color === 'green') {
      snackbarColor = 'snack-bar-setting-green';
    } else if (color === 'brown') {
      snackbarColor = 'snack-bar-setting-brown';
    }

    if (autoFade) {
      snackbarFade = 2000; // 兩秒後自動消失
      disableClick = false;
    } else {
      snackbarFade = 0; // 點選了解才消失
      disableClick = true;
    }

    // 需要點選才能消失
    if (disableClick) {
      // 設定遮罩 (不能點選其他地方)
      const overlayElement = document.createElement('div');
      overlayElement.style.position = 'fixed';
      overlayElement.style.top = '0';
      overlayElement.style.left = '0';
      overlayElement.style.width = '100%';
      overlayElement.style.height = '100%';
      overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // 半透明黑色
      overlayElement.style.zIndex = '999';
      overlayElement.style.pointerEvents = 'auto';
      document.body.appendChild(overlayElement);

      const snackBarRef = this.snackBar.open(text, confirmText, {
        duration: snackbarFade,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: [snackbarColor]
      });

      const snackBarContainer = document.querySelector('.mat-snack-bar-container') as HTMLElement;
      if (snackBarContainer) {
        snackBarContainer.style.pointerEvents = 'auto';
      }

      snackBarRef.onAction().subscribe(() => {
        if (confirmCallback) {
          confirmCallback();
        }
        document.body.removeChild(overlayElement);
      });

      snackBarRef.afterDismissed().subscribe(() => {
        if (document.body.contains(overlayElement)) {
          document.body.removeChild(overlayElement);
        }
      });

      // 取消刪除
      if (cancelText) {
        const cancelButton = document.createElement('button');
        cancelButton.textContent = cancelText;
        cancelButton.classList.add('snack-bar-cancel-button', 'mat-button', 'separate-button');
        cancelButton.addEventListener('click', () => {
          if (cancelCallback) {
            cancelCallback();
          }
          snackBarRef.dismiss();
        });

        const actionContainer = document.createElement('div');
        actionContainer.classList.add('mat-simple-snackbar-btn-container');
        actionContainer.appendChild(cancelButton);
        snackBarContainer?.appendChild(actionContainer);
      }
    } else {
      // 自動消失
      this.snackBar.open(text, confirmText, {
        duration: snackbarFade,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: [snackbarColor]
      });
    }
  }

  // 設定位置和顯示與否
  setPosition() {
    if (this.router.url === '/back/list_manage') {
      if (this.selectSubpage === 'road') {
        return 'list-road-form';
      } else {
        return 'list-road-form-none';
      }
    } else {
      return 'list-road-form';
    }
  }

  // 取消編輯後要清空input
  clearInputs() {
    const newCityElement = document.getElementById('new_city') as HTMLInputElement;
    const newTcElement = document.getElementById('new_tc_id') as HTMLInputElement;
    const newRoadElement = document.getElementById('new_road_name') as HTMLInputElement;
    const newDistrictElement = document.getElementById('new_district') as HTMLInputElement;
    const newLatElement = document.getElementById('new_lat') as HTMLInputElement;
    const newLngElement = document.getElementById('new_lng') as HTMLInputElement;

    newCityElement.value = '';
    newTcElement.value = '';
    newRoadElement.value = '';
    newDistrictElement.value = '';
    newLatElement.value = '';
    newLngElement.value = '';
    this.centerService.updateCleanAllStatus(false);
  }

  // 傳回DB確認是否有重複
  CheckDuplicate(newTc: string, newRoad: string): Promise<string>{
    return new Promise((resolve, reject) => {
      const data = { tc_id: newTc, road: newRoad };

      this.centerService
      .post('/api/tc_road/check_duplicate', data)
      .subscribe({
          next: (res) => {
              const duplicate: string = res['data'];
              resolve(duplicate);
          },
          error: (err) => {
              console.error('Error checking duplicate:', err);
              reject(err);
          }
      });
    });
  }

  // 判斷表格內容是否有變更
  checkEditingStatus() {
    if (this.insertedList.length == 0 && this.updatedList.length == 0 && this.deletedList.length == 0) {
      this.centerService.isListEditing = false;
      // console.log(`表格資料無更動，編輯狀態為${this.centerService.isListEditing}`);
    } else {
      this.centerService.isListEditing = true;
      // console.log(`表格資料有更動，編輯狀態為${this.centerService.isListEditing}`);
    }
  }


  /* -------- 表格內容編輯 -------- */
  // 單行編輯
  EditRow(data: any) {
    data.isEditing = !data.isEditing;
  }

  // 輸入判斷 (焦點轉移就會抓上一個焦點的值)
  onRoadInputChange(column: string, newData: string, data: any) {
    console.log(`---- 觸發Change 在  ${column} ----`);
    const key = `input_${data['tc_id']}_${column}`;
    const inputElement = document.getElementById(key) as HTMLInputElement;
    this.currentEditingRow = data['tc_id'];
    const originalData = data[column];

    // 檢查空值
    if (newData.length === 0) {
      this.remind(`輸入內容不得為空白！`, 'brown', true);
      if (inputElement) {
          inputElement.value = originalData;
          inputElement.focus();
      }
      return;
    }

    // 經緯度必須是數字
    if (column === 'lat' || column === 'lng') {
      const latLngRegex = /^-?\d+(\.\d{1,9})?$/;        // 可以到小數點第9位 (超過就會顯示錯誤)
      if (!latLngRegex.test(newData)) {
        this.remind('「經度/緯度」必須為數字，請修正。\n(可接受到小數點後第9位)', 'brown', false);
        if (inputElement) {
          inputElement.value = originalData;
          inputElement.focus();
        }
        return;
      }
    }

    // 判斷是否有重複 (路名)
    if (newData !== data[column]) {
      if (column === 'road') {
        this.CheckDuplicate('', newData)
          .then((duplicate) => {
            if (duplicate === '') {
              this.saveData(column, newData, data);
            } else {
              this.remind(`路名「${newData}」已存在於：
                \n縣市：${duplicate['city']}，${duplicate['district']}
                \nTC編號：${duplicate['tc_id']}`, 'brown', false);
              if (inputElement) {
                inputElement.value = originalData;
              }
              return;
            }
          })
          .catch((err) => {
              console.error('Error checking duplicate: ', err);
              this.remind('資料檢查功能故障，請聯繫相關人員。', 'red', false);
          });
      } else {
        // 其他欄位不需特殊處理，直接儲存
        this.saveData(column, newData, data);
      }
    }
  }

  // 將變更的資料放進要更新的list
  saveData(column: string, newData: string, data: any) {
    data[column] = newData;
    data.update_time = this.getFormattedDate();
    data.last_editor = this.centerService.user_name;
    this.updatedList.push(data);
    this.centerService.updatedRoadList$.next({ updatedRoadList: this.updatedList });
    this.checkEditingStatus();

    // 表格內容更新
    const index = this.listOfData.indexOf(data);
    if (index !== -1) {
      this.listOfData[index] = { ...data };
    }
    this.listOfData = [...this.listOfData];
  }

  // 焦點移開後，要切換input的編輯狀態
  checkRowFocus(event: FocusEvent, data: any) {
    console.log('---- 觸發blur 在 ', event);
    const relatedTarget = event.relatedTarget as HTMLElement;
    const currentEditingData = this.listOfData.find(item => item.tc_id === this.currentEditingRow);
    const isSameRow = (element: HTMLElement, rowId: string) => {
      while (element) {
        if (element.id && element.id.startsWith(`input_${rowId}_`)) {
          return true;
        }
        element = element.parentElement as HTMLElement;
      }
      return false;
    };

    if (!relatedTarget) {
      // console.log('   表格外   ');
      if (currentEditingData) {
        currentEditingData.isEditing = !currentEditingData.isEditing;
        this.currentEditingRow = null;
      }
    } else {
      // console.log('   表格內   ');
      if (!isSameRow(relatedTarget, data['tc_id'])) {
        // console.log('   不同行   ');
        if (currentEditingData) {
          currentEditingData.isEditing = !currentEditingData.isEditing;
          this.currentEditingRow = null;
        }
      }
    }
  }

  // 單行刪除
  RemoveRow(data: any) {
    const deletedItem = this.listOfData.find(item => item.tc_id === data['tc_id']);
    const deleteText = `
    路口編號：${deletedItem.tc_id}\n
    縣市：${deletedItem.city}\n
    路口名稱：${deletedItem.road}\n
    行政區：${deletedItem.district}\n
    經度：${deletedItem.lng}\n
    緯度：${deletedItem.lat}\n
    是否要刪除該筆路口資料?`;

    this.remind(deleteText, 'red', false,
      '確定刪除', () => {
        this.listOfData = this.listOfData.filter(item => item.tc_id !== data['tc_id']);
        if (deletedItem) {
          // 資料寫入deletedList
          this.deletedList.push(deletedItem);
        }

        this.centerService.deletedRoadList$.next({ deletedRoadList: this.deletedList });
        this.listOfData = [...this.listOfData];
        this.checkEditingStatus();
      },
      '取消刪除', () => {
        return;
      }
    );
  }

  // 單行新增
  InsertData() {
    // 取得輸入值
    const newCityElement = document.getElementById('new_city') as HTMLInputElement;
    const newTcElement = document.getElementById('new_tc_id') as HTMLInputElement;
    const newRoadElement = document.getElementById('new_road_name') as HTMLInputElement;
    const newDistrictElement = document.getElementById('new_district') as HTMLInputElement;
    const newLatElement = document.getElementById('new_lat') as HTMLInputElement;
    const newLngElement = document.getElementById('new_lng') as HTMLInputElement;
    const newCity = newCityElement.value.trim();
    const newTc = newTcElement.value.trim();
    const newRoad = newRoadElement.value.trim();
    const newDistrict = newDistrictElement.value.trim();
    let newLat = newLatElement.value.trim();
    let newLng = newLngElement.value.trim();

    // 判斷必填項目
    if (newCity === '' || newTc === '' || newRoad === '' || newDistrict === '') {
      this.remind('「縣市、路口編號、路口名稱、行政區」皆不能為空白，請輸入資料。', 'brown', true);
      return;
    }

    const latLngRegex = /^-?\d+(\.\d{1,9})?$/;        // 可以到小數點第9位 (超過就會顯示錯誤)
    // 設定緯度預設值
    if (newLat !== '') {
      if (!latLngRegex.test(newLat)) {
        this.remind('「緯度」必須為數字，請修正。\n(可接受到小數點後第9位)', 'brown', false);
        newLatElement.focus();
        return;
      }
    } else {
      newLat = '23.5';      // 預設值
    }

    // 設定經度預設值
    if (newLng !== '') {
      if (!latLngRegex.test(newLng)) {
        this.remind('「經度」必須為數字，請修正。\n(可接受到小數點後第9位)', 'brown', false);
        newLngElement.focus();
        return;
      }
    } else {
      newLng = '121';      // 預設值
    }

    // 確認是否有重複
    this.CheckDuplicate(newTc, newRoad)
      .then((duplicate) => {
        if (duplicate === '') {
          const updateTime = this.getFormattedDate();           // 更新時間為當下時間
          const lastEditor = this.centerService.user_name;
          const insertedItem = {tc_id: newTc,road: newRoad,lat: newLat,lng: newLng,district: newDistrict,city: newCity,update_time: updateTime,
            last_editor: lastEditor
          };
          this.listOfData.unshift(insertedItem);                // 新增到最前面
          this.insertedList.push(insertedItem);
          this.centerService.insertedRoadList$.next({insertedRoadList: this.insertedList});
          this.listOfData = [...this.listOfData];
          this.checkEditingStatus();

          newCityElement.value = '';
          newTcElement.value = '';
          newRoadElement.value = '';
          newDistrictElement.value = '';
          newLatElement.value = '';
          newLngElement.value = '';
          // this.pageIndex = Math.ceil(this.listOfData.length / this.pageSize);   // 新增資料後將頁數顯示最後一頁
        } else if (duplicate === 'both exist') {
          // console.log('tc_id在，road在');
          this.remind(`路口編號「${newTc}」和 路口名稱「${newRoad}」皆已存在，請修正。`, 'brown', false);

        } else if (duplicate.hasOwnProperty('tc_id')) {
	        // console.log('tc_id不在，road在');
          this.remind(`路口名稱「${newRoad}」已存在於：
            \n縣市區域：${duplicate['city']}，${duplicate['district']}
            \n路口編號：${duplicate['tc_id']}
            \n\n請修正。`, 'brown', false);

        } else if (duplicate.hasOwnProperty('road')) {
          // console.log('tc_id在，road不在');
          this.remind(`路口編號「${newTc}」已存在於：
            \n縣市區域：${duplicate['city']}，${duplicate['district']}
            \n路口名稱：${duplicate['road']}
            \n\n請修正。`, 'brown', false);

        } else {
          console.log('其他重複值狀況： ', duplicate);
          this.remind('發現重覆值異常，請聯繫相關人員。', 'red', false);
        }
      })
      .catch((err) => {
        console.error('Error checking duplicate: ', err);
        this.remind('資料檢查功能故障，請聯繫相關人員。', 'red', false);
        return;
      });
  }

}
