import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { AuthGuard } from './pages/auth/guards';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'view/search',
    pathMatch: 'full',
  },
  {
    path: 'view/search',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/search/search.module').then(m => m.SearchModule)
  },
  {
    path: 'view/analyze',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/analyze/analyze.module').then(m => m.AnalyzeModule)
  },
  {
    path: 'view/db_search',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/db-search/db-search.module').then(m => m.DbSearchModule)
  },
  {
    path: 'view/quality',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/quality/quality.module').then(m => m.QualityModule)
  },
  {
    path: 'setting/download',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/download/download.module').then(m => m.DownloadModule)
  },
  {
    path: 'setting/upload',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/upload/upload.module').then(m => m.UploadModule)
  },
  {
    path: 'setting/edit',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/edit/edit.module').then(m => m.EditModule)
  },
  {
    path: 'back/list_manage',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/list-manage/list-manage.module').then(m => m.ListManageModule)
  },
  {
    path: 'back/permission',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/permission/permission.module').then(m => m.PermissionModule)
  },
  {
    path: '404',
    component: NotFoundComponent
  },
  {
    path: '**',
    redirectTo: '404'
  },
  // 不使用原登入頁面
  // {
  //   path: 'login',
  //   canActivate: [AuthGuard],
  //   loadChildren: () => import('./pages/auth/auth.module').then(m => m.AuthModule)
  // },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: false,
      preloadingStrategy: PreloadAllModules,
      relativeLinkResolution: 'legacy'
    })
  ],
  exports: [RouterModule]
})

export class AppRoutingModule {
}
