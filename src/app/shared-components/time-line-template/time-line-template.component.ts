import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CenterService } from 'src/app/pages/center.service';

@Component({
  selector: 'app-time-line-template',
  templateUrl: './time-line-template.component.html',
  styleUrls: ['./time-line-template.component.scss']
})
export class TimeLineTemplateComponent implements OnInit, OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  @Input() timeArr;
  @Input() currentIndex: number;
  @Output() getCurrentInd = new EventEmitter();

  theme: string;
  scrollContainer: HTMLElement | null = null;
  chartOption: EChartsOption;
  chartInstance: any;
  autoPlayInterval: any;
  show_auto_icon = true;
  show_stop_icon = false;

  // 自動換算時間軸長度
  timeWidth = 1000;
  compair_arr_index = 0;

  constructor(
    private centerService: CenterService,
  ) {}

  ngOnInit(): void {
    // 切換主題
    this.centerService.theme$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((theme) => {
        this.theme = theme;
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    this.timeLineSetting();
  }

  // 時間軸設定
  timeLineSetting() {
    this.chartOption = {
      baseOption: {
        timeline: {
          axisType: 'category',
          realtime: true,
          autoPlay: false,
          playInterval: 2000,
          data: this.timeArr,
          currentIndex: this.currentIndex,
          controlStyle: {
            showPlayBtn: false,
            showNextBtn: false,
            showPrevBtn: false,
          },
          checkpointStyle: {
            color: "#005581"
          },
          progress: {
            lineStyle: {
              color: "#005581"
            },
            itemStyle: {
              color: "#005581"
            },
            label: {
              color: "#000000",
            }
          },
          symbolSize: 7,
          height: 35,
          width: this.timeArr.length > 50 ? '99%' : '90%',
          left: 12,
          label: {
            position: 'bottom',
          },
        },
      },
    }

    this.timeWidth = this.timeArr.length < 5 ? this.timeArr.length * 100 : this.timeArr.length * 60;
    this.autoPlay();
  }

  onChartInit(ec: any): void {
    this.chartInstance = ec;
    this.chartInstance.on('timelinechanged', (params) => {
      this.currentIndex = params.currentIndex;
      this.getCurrentInd.emit(this.currentIndex);
    });
  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.chartOption.baseOption.timeline.data.length;
    this.getCurrentInd.emit(this.currentIndex);
    this.updateChart();
  }

  prev(): void {
    this.currentIndex = (this.currentIndex - 1 + this.chartOption.baseOption.timeline.data.length) % this.chartOption.baseOption.timeline.data.length;
    this.getCurrentInd.emit(this.currentIndex);
    this.updateChart();
  }

  updateChart(): void {
    this.chartOption.baseOption.timeline.currentIndex = this.currentIndex;
    this.chartInstance.setOption(this.chartOption);
    this.scrollContainer = document.getElementById('container');

    const compair_arr = [];
    for (let i = 1; i * (Math.round(800 / 60) - 1) < this.timeArr.length; i++) {
      compair_arr.push(i * (Math.round(800 / 60) - 1));
    }

    this.scrollContainer!.scrollLeft = 720 * this.findPosition(this.currentIndex, compair_arr) // 切頁後不要跑
  }

  findPosition(num, arr) {
    if (num < arr[0]) {
      return 0;
    }
    for (let i = 0; i <= arr.length - 1; i++) {
      if (num >= arr[i] && num < arr[i + 1]) {
        return i + 1;
      }
    }
    if (num >= arr[arr.length - 1]) {
      return arr.length;
    }
  }

  autoPlay(): void {
    this.stopAutoPlay(true);
    this.autoPlayInterval = setInterval(() => {
      this.next();
    }, this.chartOption.baseOption.timeline.playInterval);

    this.show_auto_icon = false;
    this.show_stop_icon = true;
  }

  stopAutoPlay(from_auto_play): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }

    if (!from_auto_play) {
      this.show_auto_icon = true;
      this.show_stop_icon = false;
    }
  }

  // 監聽滑鼠水平滾動
  onMouseWheel(event: WheelEvent): void {
    document.getElementById('container')!.scrollLeft += event.deltaY;
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
