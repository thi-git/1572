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
  owner_name: string;       // 業主名稱
  project_number: string;   // 專案編號
}

@Component({
  selector: 'app-list-owner-form',
  templateUrl: './list-owner-form.component.html',
  styleUrls: ['./list-owner-form.component.scss']
})
export class ListOwnerFormComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  @Input() loading: boolean = false;
  // @Input() originData!: any[];
  @Input() listOfColumn: { title: string; value: string; width: string; }[];    // 欄位設定
  @Input() listOfData: any[];   // 資料設定
  @Input() showPagination: boolean = false;   // 顯示分頁
  @Input() pageSize: number = 4000; // 每頁可呈現的資料筆數
  @Input() scrollY: string = 'calc(100vh - 400px)';
  @Input() scrollX: string = '1280';
  tableSize = 'default';
  selectSubpage: string = 'owner';
  ownerCount: { [key: string]: { count: number, status: 'file' | 'initial' } } = {};  // 計算業主的資料筆數
  ownerCountKeys: string[] = [];
  editing: { [key: string]: boolean } = {};         // 判斷元件的編輯狀態 (true是編輯中)
  backToEdit: { [key: string]: boolean } = {};      // 判斷元件是否要維持編輯狀態
  maxId: number = 0;
  insertedList: any[] = [];     // 暫存要新增的資料
  updatedList: any[] = [];      // 暫存要更新的資料
  deletedList: any[] = [];      // 暫存要刪除的資料
  original_listOfData: any[]    // 暫存最原始的資料 (剛回傳)
  display_info: any = {};            // 專案的小幫手內容

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
        if(this.selectSubpage !== 'owner') {
          this.editing = {};
          this.listOfData = [];
          this.maxId = 0;
          this.insertedList = [];
          this.deletedList = [];
          this.updatedList = [];
          this.ownerCount = {};
        }
    });

    // 顯示表格資料
    this.centerService.ownerUploadedData$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        // console.log(`檢查一開始的編輯狀態為${this.centerService.isListEditing}`);
        this.editing = {};
        this.display_info = {};
        this.maxId = 0;
        this.insertedList = [];
        this.deletedList = [];
        this.updatedList = [];
        this.ownerCount = {};

        // 取得表格資料
        this.listOfData = res['owner_uploaded_data'];
        this.original_listOfData = this.listOfData;           // 將一開始的資料暫存
        this.listOfData.sort((a, b) => a.id - b.id);          // 排列依據

        // id最大值 (新增資料時以最大值遞增)
        for (let item of this.listOfData) {
          if (item.id && typeof item.id === 'number' && item.id > this.maxId) {
              this.maxId = item.id;
          }
        };

        // 業主列表 (記錄各個業主的資料筆數for合併欄位)
        this.listOfData.forEach(item => {
          if (this.ownerCount[item.owner_name]) {
            this.ownerCount[item.owner_name].count++;
            if (item.status === 'file' && this.ownerCount[item.owner_name].status !== 'file') {
              this.ownerCount[item.owner_name].status = 'file';
            }
          } else {
            this.ownerCount[item.owner_name] = {count: 1,status: item.status};
          }

          const totalCount = item.volume_count + item.delay_count + item.other_count;
          // (專案)小幫手換行要設定css
          this.display_info[item.project_num] = `此專案已上傳 ${item.tc_count} 個路口，${totalCount} 個檔案 \n ${item.volume_count} 個流量檔案 \n ${item.delay_count} 個延滯檔案 \n ${item.other_count} 個其他檔案`;
        });

        // 欄位數要加上新增專案編號
        for (const owner in this.ownerCount) {
          this.ownerCount[owner].count+=2;
        };
        this.ownerCountKeys = Object.keys(this.ownerCount);
        // console.log(this.listOfData);
    });
  }

  ngOnInit(): void {
    // 設定欄位
    this.listOfColumn = [
      {title: '',value: 'edit_owner',width: '7px'},
      {title: '業主名稱',value: 'owner_name',width: '15px'},
      {title: '',value: 'edit_project',width: '7px'},
      {title: '專案編號',value: 'project_num',width: '15px'},
      {title: '更新時間',value: 'update_time',width: '12px'},
      {title: '編輯人員',value: 'last_editor',width: '8px'}
    ];

    document
    .getElementById('list-owner-form')
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
      if (this.selectSubpage === 'owner') {
        return 'list-owner-form';
      } else {
        return 'list-owner-form-none';
      }
    } else {
      return 'list-owner-form';
    }
  }

  // 取消編輯後要清空所有input
  clearInputs() {
    const newOwnerElement = document.getElementById('new_owner_name') as HTMLInputElement;
    const newProjectElement = document.getElementById('new_project_number') as HTMLInputElement;
    const insertProjectElements = document.querySelectorAll('[id^="insert_project_"]') as NodeListOf<HTMLInputElement>;

    if (newOwnerElement) newOwnerElement.value = '';
    if (newProjectElement) newProjectElement.value = '';
    insertProjectElements.forEach(element => element.value = '');
    this.centerService.updateCleanAllStatus(false);
  }

  // 傳回DB確認是否有重複
  CheckDuplicate(newOwner: string, newProject: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const data = { owner_name: newOwner, project_num: newProject };

      this.centerService
      .post('/api/owner_project/check_duplicate', data)
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
      // console.log(`表格資料無更動，編輯狀態為 ${this.centerService.isListEditing}`);
    } else {
      this.centerService.isListEditing = true;
      // console.log(`表格資料有更動，編輯狀態為 ${this.centerService.isListEditing}`);
    }
  }


  /* -------- 業 主 -------- */
  // 單行編輯(業主)
  EditOwner(owner: string) {
    this.editing[owner] = !this.editing[owner];
  }

  // 輸入判斷(業主) (還沒跟最原始值比較)
  onOwnerInputChange(newOwner: string, owner: string) {
    newOwner = newOwner.trim();
    const inputElement = document.getElementById(owner) as HTMLInputElement;

    // 檢查空值
    if (newOwner.length === 0) {
      this.remind('業主名稱不得為空白。', 'brown', true);
      if (inputElement) {
        inputElement.value = owner;
        inputElement.focus();
      }
      return;
    }

    // 值有改變的時候
    if (newOwner !== owner) {
      this.CheckDuplicate(newOwner, '')
        .then((duplicate) => {
          if (duplicate === '') {
            const updatedItems = this.listOfData.filter(item => item.owner_name === owner);
            updatedItems.forEach(item => {
              item.owner_name = newOwner;
              item.update_time = this.getFormattedDate(); // 最後更新時間
              item.last_editor = this.centerService.user_name; // 最後編輯人員
              this.updatedList.push(item);
              this.centerService.updatedOwnerList$.next({ updatedOwnerList: this.updatedList });
              this.checkEditingStatus();
            });

            this.ownerCount[newOwner] = this.ownerCount[owner];
            this.ownerCountKeys = this.ownerCountKeys.map(key => (key === owner ? newOwner : key));
            // this.editing[newOwner] = true;         // 維持編輯狀態
            delete this.ownerCount[owner];
          } else {
            this.remind(`業主「${newOwner}」 已經存在，請修正。`, 'brown', false);
            this.editing[owner] = true;
            if (inputElement) {
              inputElement.value = owner;             // 原值
            }
          }
        })
        .catch((err) => {
          console.error('Error checking duplicate: ', err);
          this.remind('資料檢查功能故障，請聯繫相關人員。', 'red', false);
        });
    }
  }

  // 單行刪除(業主) (也會刪除該業主的專案)
  DeleteOwner(owner: string) {
    const deletedData = this.listOfData.filter(item => item.owner_name === owner);
    const projectNums = deletedData.map(data => `        - ${data.project_num}`).join('\n');
    const deleteText = `
    業主：\n        ${owner}\n
    專案：\n${projectNums}\n
    是否要刪除該業主資料？`;

    this.remind(deleteText, 'red', false,
      '確定刪除', () => {
        const index = this.ownerCountKeys.indexOf(owner);
        if (index !== -1) {
          this.ownerCountKeys.splice(index, 1);
        }
        delete this.ownerCount[owner];
        this.deletedList.push(...deletedData);    // 一個業主可能會有多筆專案

        this.centerService.deletedOwnerList$.next({deletedOwnerList: this.deletedList});
        this.listOfData = this.listOfData.filter(item => item.owner_name !== owner);
        this.listOfData = [...this.listOfData];
        this.checkEditingStatus();
      },
      '取消刪除', () => {
        return;
      }
    );
  }

  // 新增完整一組資料 (業主和專案)
  InsertData() {
    const newOwnerElement = document.getElementById('new_owner_name') as HTMLInputElement;
    const newProjectElement = document.getElementById('new_project_number') as HTMLInputElement;
    const newOwner = newOwnerElement.value.trim();
    const newProject = newProjectElement.value.trim();

    // 判斷有無輸入業主名稱和專案編號
    if (newOwner !== '' && newProject !== '') {
      // 判斷是否有重複值
      this.CheckDuplicate(newOwner, newProject)
        .then((duplicate) => {
          if (duplicate === '') {
              this.ownerCount[newOwner] = {count: 3, status: 'initial'};          // 初始值設定
              this.ownerCountKeys.push(newOwner);
              const insertedItem = {id: this.maxId + 1, owner_name: newOwner, project_num: newProject, update_time: this.getFormattedDate(),
                last_editor: this.centerService.user_name
              };
              this.listOfData.push(insertedItem);
              this.insertedList.push(insertedItem);
              this.maxId += 1;
              newOwnerElement.value = '';
              newProjectElement.value = '';
          } else if (duplicate === 'owner_name exists') {
            this.remind(`業主「${newOwner}」已存在，請直接前往新增專案。`, 'brown', false);
          } else if (duplicate === 'both exist') {
            this.remind(`業主「${newOwner}」和專案「${newProject}」\n皆已存在，請修正。`, 'brown', false);
          } else{
            this.remind(`專案「${newProject}」\n已被業主「${duplicate}」使用，請修正。`, 'brown', false);
          }
          this.centerService.insertedOwnerList$.next({insertedOwnerList: this.insertedList});
          this.listOfData = [...this.listOfData];
          this.checkEditingStatus();
        })
        .catch((err) => {
          console.error('Error checking duplicate: ', err);
          this.remind('資料檢查功能故障，請聯繫相關人員。', 'red', false);
        });
    } else if (newOwner !== '' && newProject === '') {
      this.remind('請輸入專案編號。', 'brown', true);
    } else if (newOwner === '') {
      this.remind('請輸入業主名稱。', 'brown', true);
    }
  }


  /* -------- 專 案 -------- */

  // 設定專案是否可以編輯 (專案的status)
  setEditBtn(status: string): string {
    return status === 'file' ? 'edit-btn-none' : 'edit-btn';
  }

  // 單行編輯(專案)
  EditProject(owner: string, projectNum: string) {
    const key = `${owner}_${projectNum}`;
    this.editing[key] = !this.editing[key];
  }

  // 輸入判斷(專案) (還沒調整完，在出現重複時不要送資料到filter)
  onProjectInputChange(newProject: string, projectNum: string, owner: string) {
    newProject = newProject.trim();
    const original_key = `${owner}_${projectNum}`;
    const inputElement = document.getElementById(original_key) as HTMLInputElement;

    // 檢查空值
    if (newProject.length === 0) {
      this.remind('專案編號不得為空白。', 'brown', true);
      if (inputElement) {
        inputElement.value = projectNum;
        inputElement.focus();
      }
      return;
    }

    // 值有改變的時候
    if (newProject !== projectNum) {
      this.CheckDuplicate('', newProject)
        .then((duplicate) => {
          if (duplicate === '') {
            const updatedItem = this.listOfData.find(item => item.owner_name === owner && item.project_num === projectNum);
            updatedItem['project_num'] = newProject;
            updatedItem['update_time'] = this.getFormattedDate(); // 最後更新時間
            updatedItem['last_editor'] = this.centerService.user_name; // 最後編輯人員
            this.updatedList.push(updatedItem);
            this.centerService.updatedOwnerList$.next({ updatedOwnerList: this.updatedList });
            this.checkEditingStatus();

            // 表格內容更新
            const index = this.listOfData.indexOf(updatedItem);
            if (index !== -1) {
              this.listOfData[index] = { ...updatedItem };
            }
            this.listOfData = [...this.listOfData];
          } else {
            this.remind(`專案「${newProject}」\n已被業主「${duplicate}」使用，請修正。`, 'brown', false);
            if (inputElement) {
              inputElement.value = projectNum;        // 原值
            }
          }
        })
        .catch((err) => {
          console.error('Error checking duplicate:', err);
          this.remind('資料檢查功能故障，請聯繫相關人員。', 'red', false);
        });
    }
  }

  // 單行刪除(專案)
  DeleteProject(owner: string, projectNum: string) {
    const deleteText = `
    業主：${owner}\n
    專案：${projectNum}\n
    是否要刪除該筆資料？`;

    this.remind(deleteText, 'red', false,
      '確定刪除', () => {
        // 更新 ownerCount
        if (this.ownerCount[owner] && this.ownerCount[owner].count > 0) {
          this.ownerCount[owner].count--;
        }

        // 資料寫入deletedList
        const deletedItem = this.listOfData.find(item => item.owner_name === owner && item.project_num === projectNum);
        if (deletedItem) {
          this.deletedList.push(deletedItem);
        }

        this.centerService.deletedOwnerList$.next({deletedOwnerList: this.deletedList});
        this.listOfData = this.listOfData.filter(item => item.owner_name !== owner || item.project_num !== projectNum);
        this.listOfData = [...this.listOfData];
        this.checkEditingStatus();
      },
      '取消刪除', () => {
        return;
      }
    );
  }

  // 單行新增(專案) (專案編號完全不能重複，跨業主也不能重複)
  AddProject(owner: string) {
    const inputElement = document.getElementById(`insert_project_${owner}`) as HTMLInputElement;    // 找到相應的input
    const newProject = inputElement.value.trim();
    const todayDate = this.getFormattedDate(); // 最後更新時間
    const lastEditor = this.centerService.user_name; // 最後編輯人員

    // 檢查空值
    if (newProject.length === 0) {
      this.remind('請輸入專案編號。', 'brown', true);
      inputElement.focus();
      return;
    }

    // 如果新的專案編號不為空，則加到對應的owner資料
    this.CheckDuplicate('', newProject)
      .then((duplicate) => {
        if (duplicate === '') {
          // 更新 ownerCount 和 ownerCountKeys
          if (this.ownerCount[owner]) {
            this.ownerCount[owner].count+=1;
          } else {
            this.ownerCount[owner].count = 1;
            this.ownerCountKeys.push(owner);
          }

          // 資料寫入insertedList
          const insertedItem = {id: this.maxId + 1,owner_name: owner,project_num: newProject,update_time: todayDate, last_editor: lastEditor};
          this.listOfData.push(insertedItem);
          this.insertedList.push(insertedItem);
          this.maxId += 1;
          inputElement.value = '';
          this.centerService.insertedOwnerList$.next({insertedOwnerList: this.insertedList});
          this.listOfData = [...this.listOfData];
          this.checkEditingStatus();
        } else {
          this.remind(`專案「${newProject}」\n已被業主「${duplicate}」使用，請修正。`, 'brown', false);
          inputElement.focus();
        }
      })
      .catch((err) => {
        console.error('Error checking duplicate: ', err);
        this.remind('資料檢查功能故障，請聯繫相關人員。', 'red', false);
      });
  }


}
