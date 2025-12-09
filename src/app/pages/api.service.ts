import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import { environment } from '../../environments/environment';
import { CenterService } from './center.service';
import { ReplaySubject } from 'rxjs';

const config = {
  serverIP: environment.serverIP,
  reqHeader: new HttpHeaders({
    'Content-Type': 'application/json',
    'access-control-allow-origin': '*',
    authorization: 'Bearer ' + localStorage.getItem('token'), // JWT放這裡
  }),
};
const config_auth = {
  serverIP: environment.authIP,
  reqHeader: new HttpHeaders({
    authorization: 'Bearer ' + localStorage.getItem('token'), // JWT放這裡
  }),
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  token: string;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    private http: HttpClient,
    private message: NzMessageService,
    public centerSVC: CenterService
  ) {}

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  public set_token(token) {
    config_auth.reqHeader = config_auth.reqHeader.set(
      'authorization',
      'Bearer ' + token
    );
    config.reqHeader = config.reqHeader.set('authorization', 'Bearer ' + token);
  }

  // get方法
  public get(url): Promise<any> {
    const URL = config.serverIP + url;
    return new Promise((resolve, reject) => {
      this.http
        .get<any>(URL, { headers: config.reqHeader })
        .subscribe(this.handleResponse(resolve, reject));
    });
  }
  public get_auth(url): Promise<any> {
    const URL = config_auth.serverIP + url;
    return new Promise((resolve, reject) => {
      this.http
        .get<any>(URL, { headers: config_auth.reqHeader })
        .subscribe(this.handleResponse(resolve, reject));
    });
  }
  // post方法
  public post(url, data): Promise<any> {
    const URL = config.serverIP + url;
    return new Promise((resolve, reject) => {
      this.http
        .post<any>(URL, data, { headers: config.reqHeader })
        .subscribe(this.handleResponse(resolve, reject));
    });
  }
  public post_auth(url, data): Promise<any> {
    const URL = config_auth.serverIP + url;
    return new Promise((resolve, reject) => {
      this.http
        .post<any>(URL, data, { headers: config_auth.reqHeader })
        .subscribe(this.handleResponse(resolve, reject));
    });
  }
  // delete方法
  public delete(url, data?): Promise<any> {
    const URL = config.serverIP + url;
    return new Promise((resolve, reject) => {
      this.http
        .delete<any>(URL, { headers: config.reqHeader, body: data })
        .subscribe(this.handleResponse(resolve, reject));
    });
  }
  public delete_auth(url, data?): Promise<any> {
    const URL = config_auth.serverIP + url;
    return new Promise((resolve, reject) => {
      this.http
        .delete<any>(URL, { headers: config_auth.reqHeader, body: data })
        .subscribe(this.handleResponse(resolve, reject));
    });
  }
  // put方法
  public put(url, data): Promise<any> {
    const URL = config.serverIP + url;
    return new Promise((resolve, reject) => {
      this.http
        .put<any>(URL, data, { headers: config.reqHeader })
        .subscribe(this.handleResponse(resolve, reject));
    });
  }
  public put_auth(url, data): Promise<any> {
    const URL = config_auth.serverIP + url;
    return new Promise((resolve, reject) => {
      this.http
        .put<any>(URL, data, { headers: config_auth.reqHeader })
        .subscribe(this.handleResponse(resolve, reject));
    });
  }
  // 錯誤跳轉(待調整)
  handleResponse(resolve: any, reject: any) {
    return {
      next: (res: any) => {
        resolve(res);
      },
      error: (err: any) => {
        console.log(err);
      }
    };
  }
}
