import { Component, OnInit, NgZone } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { CenterService } from 'src/app/pages/center.service';

@Component({
  selector: 'app-drawing-info',
  templateUrl: './drawing-info.component.html',
  styleUrls: ['./drawing-info.component.scss']
})
export class DrawingInfoComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  selectEditStep: string = '';
  roadTitle: string = '';
  selectedRoadName: string = '請選擇路段';
  roadSectionGroup = []; // 儲存路段資料
  panelOpenRoad: boolean = false;
  selectedData;
  selectedValue = '';
  previousSelect = '';

  constructor(
    private centerService: CenterService,
    private ngZone: NgZone
  ) {
    // 編輯步驟選擇
    this.centerService.editSelect$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.selectEditStep = res['selectEditStep'];
        this.selectedRoadName = '請選擇路段';
        this.selectedValue = '';
        this.previousSelect = '';
      })

    // 取得該路口資料
    this.centerService.sendRoadSectionInfo$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.roadTitle = res['road'];
        this.roadSectionGroup = res['roadSectionGroup'];
      })

    // 地圖上直接點選箭頭進行編輯
    this.centerService.clickMarker$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.ngZone.run(() => {
          if(res['type'] === 'road') {
            this.selectedValue = res['data']['direction'];
            this.selectRoad(res['data']);
          }
        })
      })

    // 每次暫時完成重新設定previous
    this.centerService.tempFinish$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.previousSelect = '';
      })
  }

  ngOnInit(): void {}

  // 選擇要編輯的路段
  selectRoad(data) {
    this.selectedData = data;
    this.selectedRoadName = `(${data.direction}) ${ data.roadName }`;

    // 傳送訊息給地圖(如果選到同一條就不傳訊息)
    if(this.previousSelect !== this.selectedRoadName) {
      this.centerService.sendSelectedRoad$.next({
        selectedData: this.selectedData
      })
    }
    this.previousSelect = this.selectedRoadName;
    this.panelOpenRoad = false;
  }
}
