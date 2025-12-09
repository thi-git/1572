import { Component, OnInit, OnDestroy } from '@angular/core';
import { CenterService } from '../../pages/center.service';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import LuckyExcel from 'luckyexcel';


@Component({
  selector: 'app-excel-preview',
  templateUrl: './excel-preview.component.html',
  styleUrls: ['./excel-preview.component.scss'],
})
export class ExcelPreviewComponent implements OnInit, OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  options = {
    enableAddBackTop: false, // 返回头部按钮
    allowCopy: false, // 是否拷貝
    showtoolbar: false, // 是否顯示工具列
    showinfobar: false,
    allowEdit: false,
    sheetFormulaBar: false,
    enableAddRow: false,
    enableAddCol: false,
    showsheetbar: true, // sheet 顯示
    showRowBar: false,
    showColumnBar: false,
    sheetBottomConfig: false,
    showsheetbarConfig: {
      add: false,
      menu: false,
      sheet: true,
    },
    cellRightClickConfig: {
      copy: false, // copy
      copyAs: false, // copy as
      paste: false, // paste
      insertRow: false, // insert row
      insertColumn: false, // insert column
      deleteRow: false, // delete the selected row
      deleteColumn: false, // delete the selected column
      deleteCell: false, // delete cell
      hideRow: false, // hide the selected row and display the selected row
      hideColumn: false, // hide the selected column and display the selected column
      rowHeight: false, // row height
      columnWidth: false, // column width
      clear: false, // clear content
      matrix: false, // matrix operation selection
      sort: false, // sort selection
      filter: false, // filter selection
      chart: false, // chart generation
      image: false, // insert picture
      ink: false, // insert link
      data: false, // data verification
      cellFormat: false, // Set cell format
    },
    sheetRightClickConfig: {
      delete: false, // 刪除
      copy: false, // 複製
      rename: false, // 重新命名
      color: false, // 更改顏色
      hide: false, // 隱藏
      move: false, // 移動
    },
  };

  isDisplay = false;

  constructor(
    private centerService: CenterService
  ) {}

  ngOnInit(): void {
    // document.getElementById('excel-preview').addEventListener('click', (e) => {
    //   this.centerService.windowClick$.next(true);
    // });

    // 接收excel資料進行預覽
    this.centerService.excelPreview$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((excel: any) => {
        this.isDisplay = true;
        this.getFile(excel.item(0)); // 目前只預覽第一個檔案(待調整)
      });

    // 接收開始上傳的訊息
    this.centerService.uploadTest$
    .pipe(takeUntil(this.destroyed$))
    .subscribe((res) => {
      // if(res['uploadStatus']) {
        this.isDisplay = false;
        // 清除預覽畫面
        let nativeWindow = this.centerService.nativeWindow;
        nativeWindow.luckysheet.destroy();
      // }
    });
  }

  // 顯示預覽內容
  getFile(excel) {
    if(excel) {
      let nativeWindow = this.centerService.nativeWindow;
      let worksheet = [];
      LuckyExcel.transformExcelToLucky(excel, (exportJson) => {
        // 只顯示前兩個worksheet
        let workSheetNameArr = ['轉向量', '路口基本資料(IN)'];
        worksheet = exportJson.sheets.filter((item) => workSheetNameArr.includes(item.name));
        // Get the worksheet data after conversion
        nativeWindow.luckysheet.create({
          container: 'luckysheet', // luckysheet is the container id
          data: worksheet,
          title: exportJson.info.name,
          enableAddBackTop: false, // 返回头部按钮
          allowCopy: false, // 是否拷貝
          showtoolbar: false, // 是否顯示工具列
          showinfobar: false,
          allowEdit: false,
          sheetFormulaBar: false,
          enableAddRow: false,
          enableAddCol: false,
          showRowBar: false,
          showColumnBar: false,
          sheetBottomConfig: true,
          showsheetbar: true, //sheet 顯示
          showsheetbarConfig: {
            add: false,
            menu: false,
            sheet: true,
          },
          cellRightClickConfig: {
            copy: false, // copy
            copyAs: false, // copy as
            paste: false, // paste
            insertRow: false, // insert row
            insertColumn: false, // insert column
            deleteRow: false, // delete the selected row
            deleteColumn: false, // delete the selected column
            deleteCell: false, // delete cell
            hideRow: false, // hide the selected row and display the selected row
            hideColumn: false, // hide the selected column and display the selected column
            rowHeight: false, // row height
            columnWidth: false, // column width
            clear: false, // clear content
            matrix: false, // matrix operation selection
            sort: false, // sort selection
            filter: false, // filter selection
            chart: false, // chart generation
            image: false, // insert picture
            ink: false, // insert link
            data: false, // data verification
            cellFormat: false, // Set cell format
          },
          sheetRightClickConfig: {
            delete: false, // 刪除
            copy: false, // 複製
            rename: false, // 重新命名
            color: false, // 更改顏色
            hide: false, // 隱藏
            move: false, // 移動
          },
        });
      });
    }
  }

  ngAfterViewInit() {}

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
