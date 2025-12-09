import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { routes } from '../../../routes';
import * as _ from 'lodash';

@Injectable()
export class AuthGuard implements CanActivate{
  public routers: typeof routes = routes;

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    let page_perm = localStorage.getItem('page_perm').split(',');
    let last_path = state.url.substring(state.url.lastIndexOf('/') + 1);
    if(page_perm.includes(last_path))
      return true;
    else
      return false;
  }
}
