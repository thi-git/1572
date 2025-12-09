import { Component, OnInit, NgZone } from '@angular/core';
import { CenterService } from 'src/app/pages/center.service';
import { MatDialog } from '@angular/material/dialog';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';


@Component({
  selector: 'app-data-analyze',
  templateUrl: './data-analyze.component.html',
  styleUrls: ['./data-analyze.component.scss']
})
export class DataAnalyzeComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  cardSetting;
  showAnalyze = false;
  bigOrSmall = true; // 元件開合

  // panel
  panelOpenDisplay: boolean = false;
  panelOpenPeriod: boolean = false;

  // 顯示的主題
  displayOption = [
    { name: '路線流量分時折線圖', value: 1 },
    { name: '號誌路口轉向量', value: 2 },
  ];

  // 時段選擇選單(晨峰/離峰/昏峰)
  periodOption = [];

  // 預設顯示
  displayValue = '路線流量分時折線圖';
  selectDisplayValue = 1; // 不同模式顯示不同區塊和filter(折線圖1, 轉向量2)

  periodValue = ''; // 晨峰/昏峰/離峰(由後端資料填入)

  // 折線圖設定
  chartOption = {};
  echartsInstance;
  forLineBackground = []; // 折線圖背景設定

  selectedTC = [];
  sectionDataFormatted; // 折線圖資料設定
  timeArr = []; // 折線圖x軸時間
  positionData; // 給小地圖
  allData; // 給小地圖
  whichTime; // 給小地圖
  rank_volume: string; // 排名
  isFullTime = false; // 是否選擇全時段
  data_type = 'volume';

  constructor(
    private centerService: CenterService,
    public dialog: MatDialog,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // 資料類型(單選)
    this.centerService.dataType$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((type: string) => {
        this.data_type = type;
      });

    // 訂閱回傳資料
    this.centerService.statisticsData$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        // 延滯不顯示
        this.showAnalyze = res['data_type'] === 'volume' ? true : false;
        this.bigOrSmall = true; // 只要顯示分析元件就預設true(之後依情況調整)

        // 只有流量資料需要顯示
        if (this.data_type == 'volume') {
          this.allData = res;
          this.selectedTC = res['mainTC'];
          this.periodOption = [];

          // 回復預設(之後依情況調整)
          this.displayValue = '路線流量分時折線圖';
          this.selectDisplayValue = 1;

          if (res['time_ch_arr'][0].includes('全時段')) {
            // 平日&假日全時段
            this.isFullTime = true;
            if (res['time_ch_arr'][0].includes('平日')) {
              // 平日
              this.periodOption.push({ name: '平日晨峰(06-10)', name_map: 'morning_peak' })
              this.periodOption.push({ name: '平日離峰(10-16)', name_map: 'morning_off_peak' })
              this.periodOption.push({ name: '平日昏峰(16-20)', name_map: 'evening_peak' })
            } else if (res['time_ch_arr'][0].includes('假日')) {
              // 假日
              this.periodOption.push({ name: '假日晨峰(09-13)', name_map: 'morning_peak' })
              this.periodOption.push({ name: '假日離峰(13-16)', name_map: 'off_peak' })
              this.periodOption.push({ name: '假日昏峰(16-20)', name_map: 'evening_peak' })
            }
          } else {
            // 部分時段
            this.isFullTime = false;
            res['time_ch_arr'].forEach(element => {
              if (element.includes('平日晨峰')) {
                this.periodOption.push({ name: '平日晨峰(06-10)', name_map: 'morning_peak' })
              }
              if (element.includes('平日離峰')) {
                this.periodOption.push({ name: '平日離峰(10-16)', name_map: 'morning_off_peak' })
              }
              if (element.includes('平日昏峰')) {
                this.periodOption.push({ name: '平日昏峰(16-20)', name_map: 'evening_peak' })
              }
              if (element.includes('假日晨峰')) {
                this.periodOption.push({ name: '假日晨峰(09-13)', name_map: 'morning_peak' })
              }
              if (element.includes('假日離峰')) {
                this.periodOption.push({ name: '假日離峰(13-16)', name_map: 'off_peak' })
              }
              if (element.includes('假日昏峰')) {
                this.periodOption.push({ name: '假日昏峰(16-20)', name_map: 'evening_peak' })
              }
            });
          }
          this.periodValue = this.periodOption[0]['name']; // 名稱(預設第一項)
          this.whichTime = this.periodOption[0]['name_map']; // 後端資料名稱(預設第一項)

          // 前端設定顯示時間為06:00~21:45(後端是傳送所有資料)
          let hour_start;
          let hour_end;
          if (res['weekday'] === '平日') {
            hour_start = 6;
            hour_end = 22;
          } else if(res['weekday'] === '假日') {
            hour_start = 9;
            hour_end = 20;
          }

          this.timeArr = [];
          for (var hours = hour_start; hours < hour_end; hours++) {
            for (var minutes = 0; minutes < 60; minutes += 15) {
              var formattedHours = (hours < 10 ? '0' : '') + hours;
              var formattedMinutes = (minutes === 0 ? '00' : minutes);
              this.timeArr.push(formattedHours + ':' + formattedMinutes);
            }
          }

          // 折線圖資料設定
          this.sectionDataFormatted = this.sectionDataRestructuring(res);

          // 流量排名資料設定
          this.rankVolumeSetting(res['allData']['ranking'], res['weekday'], res['time_ch_arr']).then(values => {
            this.lineSetting(); // 圖表設定
          })
        }
      });


    // 訂閱allTC資料
    this.centerService.tcAllData$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.positionData = res['tc_all_data'];
      });


    // 訂閱tc換位置
    this.centerService.tcSmallCardChangePosition$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        function moveTcId(direction, tcId, array) {
          const index = array.indexOf(tcId);
          if (index === -1) {
            console.log('未找到tc_id');
            return array;
          }
          const newArray = [...array];
          if (direction === 'right') {
            if (index < newArray.length - 1) {
              [newArray[index], newArray[index + 1]] = [newArray[index + 1], newArray[index]];
            } else {
              console.log('已在最右側');
            }
          } else if (direction === 'left') {
            if (index > 0) {
              [newArray[index], newArray[index - 1]] = [newArray[index - 1], newArray[index]];
            } else {
              console.log('已在最左側');
            }
          } else {
            console.log('無效方向');
          }
          return newArray;
        }

        const newArray = moveTcId(res['whichDirection'], res['tc_id'], this.selectedTC);
        this.selectedTC = newArray;
      });
  }

  // 選單(折線圖/轉向量)
  selectDisplay(value) {
    const filtered = this.displayOption.filter(function (item) {
      return item.value === value;
    });
    this.displayValue = filtered[0]['name'];
    this.selectDisplayValue = value;
    this.panelOpenDisplay = false;

    // 傳訊息給map-analyze，TC可以偵測click事件
    if(value === 2) {
      this.centerService.canClickTC$.next({
        canClick: true
      });
    } else {
      this.centerService.canClickTC$.next({
        canClick: false
      });
    }
  }

  // 選單(晨峰/離峰/昏峰)
  selectPeriod(value) {
    if (value === '平日晨峰(06-10)') {
      this.whichTime = 'morning_peak';
      this.periodValue = '平日晨峰(06-10)';
    } else if (value === '平日離峰(10-16)') {
      this.whichTime = 'morning_off_peak';
      this.periodValue = '平日離峰(10-16)';
    } else if (value === '平日昏峰(16-20)') {
      this.whichTime = 'evening_peak';
      this.periodValue = '平日昏峰(16-20)';
    } else if (value === '假日晨峰(09-13)') {
      this.whichTime = 'morning_peak';
      this.periodValue = '假日晨峰(09-13)';
    } else if (value === '假日離峰(13-16)') {
      this.whichTime = "off_peak";
      this.periodValue = '假日離峰(13-16)';
    } else if (value === '假日昏峰(16-20)') {
      this.whichTime = 'evening_peak';
      this.periodValue = '假日昏峰(16-20)';
    }
    this.panelOpenPeriod = false;
  }

  // 開啟/收合分析元件
  changeShowAnalyze() {
    this.bigOrSmall = !this.bigOrSmall;
  }

  onChartInit(event) {
    this.echartsInstance = event;
  }

  // 折線圖資料設定
  sectionDataRestructuring(sectionData) {
    const transformedData = {};

    sectionData['mainTC'].forEach(item => {
      const tcId = item;

      if (!transformedData[tcId]) {
        transformedData[tcId] = {};
      }

      this.timeArr.forEach(e => {
        if (!transformedData[tcId][e]) {
          if (this.isTimeInRanges(e, sectionData['time_period'])) {
            transformedData[tcId][e] = sectionData['allData'][tcId]['volume_data']['total'][e];
          } else {
            transformedData[tcId][e] = 0;
          }
        }
      })
    });
    return transformedData;
  }

  // 流量排名資料設定
  rankVolumeSetting(data, weekday, time_ch_arr) {
    return new Promise<void>((resolve, reject) => {
      this.rank_volume = '';
      this.forLineBackground = [];
      let maxValues;
      let timeRanges = [];
      if (weekday === '平日') {
        if (this.isFullTime) {
          // 全時段
          timeRanges.push({ start: '06:00', end: '09:00', label: '平日晨峰' })
          timeRanges.push({ start: '10:00', end: '15:00', label: '平日離峰' })
          timeRanges.push({ start: '16:00', end: '20:00', label: '平日昏峰' })
        } else {
          // 部分時段
          time_ch_arr.forEach(element => {
            if (element.includes('平日晨峰')) {
              timeRanges.push({ start: '06:00', end: '09:00', label: '平日晨峰' })
            }
            if (element.includes('平日離峰')) {
              timeRanges.push({ start: '10:00', end: '15:00', label: '平日離峰' })
            }
            if (element.includes('平日昏峰')) {
              timeRanges.push({ start: '16:00', end: '20:00', label: '平日昏峰' })
            }
          });
        }
        maxValues = timeRanges.map(range => this.findMaxValueAndTime(range.start, range.end, data));
      } else if(weekday === '假日') {
        if (this.isFullTime) {
          // 全時段
          timeRanges.push({ start: '09:00', end: '12:00', label: '假日晨峰' })
          timeRanges.push({ start: '13:00', end: '15:00', label: '假日離峰' })
          timeRanges.push({ start: '16:00', end: '20:00', label: '假日昏峰' })
        } else {
          // 部分時段
          time_ch_arr.forEach(element => {
            if (element.includes('假日晨峰')) {
              timeRanges.push({ start: '09:00', end: '12:00', label: '假日晨峰' })
            }
            if (element.includes('假日離峰')) {
              timeRanges.push({ start: '13:00', end: '15:00', label: '假日離峰' })
            }
            if (element.includes('假日昏峰')) {
              timeRanges.push({ start: '16:00', end: '20:00', label: '假日昏峰' })
            }
          });
        }
        maxValues = timeRanges.map(range => this.findMaxValueAndTime(range.start, range.end, data));
      }

      maxValues.forEach((maxValue, index) => {
        this.rank_volume += `<br />${timeRanges[index]['label']}：${maxValue.maxTime} - ${this.addOneHour(maxValue.maxTime)}`;
        this.forLineBackground.push(
          [
            {
              name: timeRanges[index]['label'],
              xAxis: maxValue.maxTime
            },
            {
              xAxis: this.addOneHour(maxValue.maxTime)
            }
          ]
        );
      });
      resolve();
    })
  }

  // 圖表設定
  lineSetting() {
    let names = [], series = [];
    Object.entries(this.sectionDataFormatted).forEach(entry => {
      const [key, value] = entry;
      const filteredData = this.positionData.filter(item => item.tc_id === key)[0];
      names.push(filteredData.road);
      series.push({
        name: filteredData.road,
        type: 'line',
        label: {
          normal: {
            show: false,
            position: 'top'
          }
        },
        itemStyle: {
          normal: {
            lineStyle: {
              width: 3,
            },
          }
        },
        data: Object.values(value).map(item => { return item })
      })
    });

    // 最後一項設定空資料並加入背景區域
    series.push({
      name: '空資料',
      type: 'line',
      label: {
        normal: {
          show: false,
          position: 'top'
        }
      },
      itemStyle: {
        normal: {
          lineStyle: {
            width: 3,
          },
        }
      },
      data: []
    })

    series[series.length - 1].markArea = {
      label: {
        color: "#242424"
      },
      itemStyle: {
        color: 'rgba(255, 173, 177, 0.4)'
      },
      data: this.forLineBackground
    };

    // 圖表設定
    this.chartOption = {
      // tooltip: {
      //   trigger: 'axis',
      //   formatter: (parmas) => {
      //     const text = [];
      //     const section = [];
      //     parmas.forEach((e, i) => {
      //       section[i] = `<br>${e.marker}${e.seriesName}：${e.value.toFixed(2)}`;
      //     });
      //     text.push(section.join(''));
      //     return `時間：${parmas[0].axisValue}${text}`;
      //   },
      // },
      legend: {
        type: 'scroll',
        itemWidth: 20,
        itemHeight: 5,
        right: 10,
        top: 10,
        data: names,
        orient: 'vertical',
        textStyle: {
          fontSize: 16,
          color: '#242424',
        },
        formatter: function (name) {
          if (name.length > 16) {
            return name.substring(0, 16) + "...";
          } else {
            return name;
          }
        }
      },
      grid: {
        left: '3%',
        right: '20%',
        bottom: '5%',
        top: '10%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: true,
          data: this.timeArr,
          axisTick: {
            show: false
          },
        }
      ],
      yAxis: [
        {
          type: 'value',
          nameLocation: 'middle',
          nameTextStyle: {
            fontSize: 18,
            padding: 25,
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
            }
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            formatter: (value) => {
              return `${value}`;
            }
          },
        }
      ],
      series: series
    }

    // 自訂義tooltip顯示
    this.chartOption['tooltip'] = {
      trigger: 'axis',
      formatter: (params) => {
        let time = params[0].name + '<br/>';
        let allData = [];
        params.forEach((e) => {
          if(e['value'] === undefined) {
            allData.push(`${e['marker']}${e['seriesName']}：-`);
          } else {
            allData.push(
              `${e['marker']}${e['seriesName']}：${Number(e['value']).toFixed(2)}`
            );
          }
        });
        let data = allData.join('<br/>');
        return `${time}${data}`;
      },
      position: function (point, params, dom, rect, size) {
        // 計算底部應該對齊的位置
        const tooltipHeight = dom.offsetHeight; // tooltip高度
        const chartWidth = size.viewSize[0]; // 圖表寬度
        const chartHeight = size.viewSize[1]; // 圖表高度
        const yPosition = chartHeight - tooltipHeight - 10; // 讓tooltip顯示在圖表的底部，距離底部10px
        return [point[0] - 10, yPosition - 160]; // 在右側移動
      },
      extraCssText: 'width: 360px; max-height: 50vh; overflow-y: auto;',
      enterable: true,
      showDelay: 0,
      hideDelay: 100
    };
  }

  findMaxValueAndTime(start, end, rankingData) {
    let maxTime = '';
    let maxValue = -Infinity;

    for (let time in rankingData) {
      if (time >= start && time <= end) {
        const value = rankingData[time];
        if (value > maxValue) {
          maxValue = value;
          maxTime = time;
        }
      }
    }
    return { maxTime, maxValue };
  }

  addOneHour(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);

    const dateObj = new Date();
    dateObj.setHours(hours);
    dateObj.setMinutes(minutes);

    const newHours = String(dateObj.getHours() + 1).padStart(2, '0');
    const newMinutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${newHours}:${newMinutes}`;
  }

  // 檢查該時段是否在所選時間範圍內
  isTimeInRanges(time, range) {
    // 日期隨便設
    const timeValue = new Date(`2023-01-01T${time}`);
    const startTimeValue = new Date(`2023-01-01T${range[0]}`);
    const endTimeValue = new Date(`2023-01-01T${range[1]}`);
    if (timeValue >= startTimeValue && timeValue <= endTimeValue) {
      return true;
    }
    return false;
  }
}
