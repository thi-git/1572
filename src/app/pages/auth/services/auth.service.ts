import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // 登出
  public signOut(): void {
    window.location.href = `${environment.authIP}/realms/1493/protocol/openid-connect/logout?post_logout_redirect_uri=${localStorage.getItem('into_url')}&client_id=1493web&id_token_hint=${localStorage.getItem('id_token')}`;
  }
}
