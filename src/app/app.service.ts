import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';
import { CenterService } from './pages/center.service';
import * as _ from 'lodash';

@Injectable()
export class AppService {
  headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'access-control-allow-origin': '*',
  })
  route_subscribe: Subscription;

  constructor(
    private http: HttpClient,
    private router: Router,
    public centerService: CenterService
  ) {}

  parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  }

  get_ui_record = () => {
    const url = new URL(location.href);
    let access_token = '';
    // 檢查URL來源是否有code參數
    if (url.searchParams.has('code')) {
      // 設定keycloak參數
      let token_param = new HttpParams();
      token_param = token_param.set("client_id", "1493web")
        .set("redirect_uri", localStorage.getItem('into_url'))
        .set("code", url.searchParams.get('code'))
        .set("grant_type", "authorization_code");
      // 取得keycloak token需使用application/x-www-form-urlencoded
      let header = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
      // 取得keycloak token
      return this.http.post<any>(`${environment.authIP}/realms/1493/protocol/openid-connect/token`, token_param, { headers: header }).toPromise().then(res => {
        // 以access token 取得者用者資訊
        access_token = res.access_token;
        let token_data = this.parseJwt(access_token);
        this.centerService.user_name = token_data['preferred_username'];
        localStorage.setItem('page_perm', token_data.ucr);

        // 記錄THI token
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token);
        localStorage.setItem('id_token', res.id_token);
        this.centerService.set_token(res.access_token);
        this.headers = new HttpHeaders({ 'Authorization': `Bearer ${res.access_token}` });

        return this.http.get<any>(environment.serverIP + '/api/ui/get_ui_record', { headers: this.headers }).toPromise();
      })
      .then((res: any) => {
        this.http.get<any>(environment.serverIP + '/api/users/get_user_info', { headers: this.headers }).toPromise()
        .then(e => {
          this.centerService.setAuthDataTest = e['data'].filter(t => t['user_name'] === this.centerService.user_name)[0]['selected_auth'];
        })

        // 存入local storage
        localStorage.setItem('1493cfg', JSON.stringify(res.data));
        // 取得轉跳原始的URL
        let loc = new URL(localStorage.getItem('into_url'));
        // 開始轉跳(轉跳路徑需要移除URL前綴)
        this.router.navigate([loc.pathname.replace('1493', '')]);
      })
      .catch(err => {
        // 提示使用者後端系統故障
        alert("後端系統故障，請聯繫開發人員");
      });
    } else {
      // 記錄欲轉跳URL
      localStorage.setItem('into_url', location.href);
      // 無code參數重新導向
      window.location.href = `${environment.authIP}/realms/1493/protocol/openid-connect/auth?response_type=code&client_id=1493web&scope=openid&redirect_uri=${localStorage.getItem('into_url')}`;
    }
  }
}
