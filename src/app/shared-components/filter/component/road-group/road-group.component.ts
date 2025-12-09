import { Component, OnInit } from '@angular/core';
import { CenterService } from 'src/app/pages/center.service';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/pages/auth/services';

@Component({
  selector: 'app-road-group',
  templateUrl: './road-group.component.html',
  styleUrls: ['./road-group.component.scss']
})
export class RoadGroupComponent implements OnInit {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  panelOpen: boolean = false;
  isData: boolean = false; // 判斷是否有資料(無資料時不會顯示選單，否則會有錯誤)
  originData; // 儲存撈到的TC&路名資料
  all_tc_id: any = []; // 包含tc_id
  all_tc_road: any = []; // 包含tc_id和路名
  treeList = [];

  constructor(
    private centerService: CenterService,
    private authService: AuthService,
    private snackBar: MatSnackBar
    ) {}

  ngOnInit(): void {
    // 取得所有TC&路名(用來顯示filter選項)
    this.centerService.get('/api/tc_road/get_all_info').subscribe({
      next: (res)=>{
        if(res['data'].length > 0) {
          // 按tc_id(數字部分)排序
          this.originData = res['data'];
          this.originData.sort((a, b) => {
            let numA = parseInt(a.tc_id.replace('TC', ''));
            let numB = parseInt(b.tc_id.replace('TC', ''));
            return numA - numB;
          })
          this.cleanData();
        }
      },
      error: (err) => {
        console.log(err);
        if(err.error.msg === 'Token has expired') {
          this.authService.signOut(); // token過期登出
        } else {
          this.remind('未取得TC靜態資料', 'red', false);
        }
      }
    })

    // 如果點擊視窗，就會將filter收合
    this.centerService.windowClick$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((click)=>{
        if(click){
          this.panelOpen = false;
        }
      })
  }

  getName(e){
    const all_tc_road =  this.all_tc_road.filter((el) => {
      if(e.length === 0) {
        e = this.all_tc_id;
      }
      if(e.includes(el[0])) return el;
    })
    // 傳送資料給search btn
    this.centerService.mainRoad$.next({
      tcId: e,
      tcIdRoad: all_tc_road
    })
  }

  // 將資料洗成需要的格式
  cleanData(){
    this.all_tc_id.length = 0;
    this.treeList = this.originData.map((e: any) => {
      this.all_tc_id.push(e['tc_id']);
      this.all_tc_road.push([e['tc_id'], e['road']]);
      return e = {text: `${e['tc_id']} ${e['road']}`, value: e['tc_id'], collapsed: true}
    })

    this.isData = this.treeList.length > 0 ? true : false;
  }

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

}
