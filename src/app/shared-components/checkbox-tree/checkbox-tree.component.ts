import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { TreeviewItem, TreeviewConfig } from 'ngx-treeview';
import { ReplaySubject } from 'rxjs';


@Component({
  selector: 'app-checkbox-tree',
  templateUrl: './checkbox-tree.component.html',
  styleUrls: ['./checkbox-tree.component.scss']
})
export class CheckboxTreeComponent implements OnInit, OnChanges {
  @ViewChild('treeDOM', { read: ElementRef }) treeDOM: ElementRef;
  @Output() getName = new EventEmitter();
  @Input() treeList: Array<any>;  // 最原始樹狀圖資料
  @Input() storageList: Array<string>; // 上一次選擇的資料
  @Input() custom: string; // 判斷是否為main-road元件
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  items: TreeviewItem[];
  config = TreeviewConfig.create({
    hasAllCheckBox: true,
    hasFilter: true,
    hasCollapseExpand: true,
    decoupleChildFromParent: false,
    // maxHeight: 500
  });

  userSearchWord = ''; // 記錄使用者搜尋的(所有)關鍵字
  itemsSave = []; // 保留全部選項資料(TreeviewItem)
  itemsSelectStatus = new Set(); // 儲存搜尋選項的勾選狀態(TreeviewItem)
  selectedRoad = new Set(); // 多組關鍵字時保留之前所選選項

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (changes.treeList) {
        this.items = this.getBooks(changes.treeList.currentValue);

        // 取消預設全選
        this.items.forEach((item) => {
          item.checked = false;
          if (item['internalChildren']) {
            item['internalChildren'].forEach((children) => {
              children.checked = false;
            })
          }
        })
      }
    }, 500);
  }

  ngOnInit(): void {
    // this.config.hasFilter = this.custom === 'main_road' ? false : true;

    // 把上次儲存的資料再次顯示出來
    if (this.storageList !== undefined && this.storageList.length > 0) {
      this.treeList.forEach(e => {
        if (e['children']) {
          e['children'].forEach(j => {
            j['checked'] = this.storageList.includes(j.value) ? true : false;
          });
        } else {
          e['checked'] = this.storageList.includes(e.value) ? true : false;
        }
      })
    }
    this.items = this.getBooks(this.treeList);

    // 取消預設全選
    this.items.forEach((item) => {
      item.checked = false;
      if (item['internalChildren']) {
        item['internalChildren'].forEach((children) => {
          children.checked = false;
        })
      }
    })

    // 儲存一份所有選項的資料
    this.itemsSave = this.items.slice();
  }

  ngAfterViewInit(): void {
    const input_element = this.treeDOM.nativeElement.querySelector('input');
    input_element.setAttribute('placeholder', '關鍵字搜詢');
    input_element.setAttribute('style', 'margin-top: 6px; color: black;');
    this.treeDOM.nativeElement.querySelector('label').innerHTML = '全選';
  }

  // treeList內容轉換
  getBooks(data): TreeviewItem[] {
    const books = [];
    data.forEach(e => {
      books.push(new TreeviewItem(e))
    });
    return books;
  }

  onFilterChange(value: string): void {}

  // 勾選設定
  onSelect(e) {
    this.getName.emit(e);
  }

  // custom multiple filter(使用者可搜尋兩組以上關鍵字)
  multipleFilter(event: any) {
    this.userSearchWord = event['target']['value'];
    let itemSort = this.itemsSave.slice();

    if (this.userSearchWord.includes(' ')) {
      // 以空白分割關鍵字並過濾掉空字串
      let selectwordSplit = this.userSearchWord.split(' ');
      selectwordSplit = selectwordSplit.filter(e => e !== '');

      // 判斷有沒有包含任一組關鍵字並計算符合的組數
      itemSort.forEach(e => {
        let count = 0;
        selectwordSplit.forEach(word => {
          if (e['text'].includes(word)) count++;
        })
        e['count'] = count;
      })

      // 過濾出有符合關鍵字的選項並依count大小排序
      itemSort = itemSort.filter(e => e['count'] > 0).sort((a, b) => b.count - a.count);

      // 頁面要顯示的選項設定
      this.items = itemSort;
    } else {
      // 沒有空白 => 代表只有一組關鍵字
      this.items = this.itemsSave.filter(e => {
        if (e['text'].includes(this.userSearchWord)) return e;
      })
    }
  }
}

// 傳送過來的treeList資料樣式
//    [
//      {
//        text: '行政區名子(顯示的)',
//        value: '',
//        collapsed: true,  // true代表一開始關起來不展開
//        children: [
//          { text: '路名A', value: '路名A' },
//          { text: '路名B', value: '路名B' },
//          { text: '路名C', value: '路名C' }
//        ]
//      },
//      {
//        // 與上面相同
//      }
//    ]
