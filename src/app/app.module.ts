import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// // ANT 國際化
import { zh_TW, NZ_I18N, NzI18nModule } from 'ng-zorro-antd/i18n';

import { AppComponent } from './app.component';
import { LayoutsModule } from './layouts/layouts.module';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { BasicTemplateComponent } from './template/basic-template/basic-template.component';
import { NgxEchartsModule } from 'ngx-echarts';
//pages
import { AuthModule } from './pages/auth/auth.module';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { AppService } from './app.service';

@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent,
    BasicTemplateComponent,
  ],
  imports: [
    BrowserModule,
    LayoutsModule,
    AuthModule,
    BrowserAnimationsModule,
    RouterModule,
    AppRoutingModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    NzI18nModule,
    HttpClientModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'),
    }),
  ],
  providers: [
    { provide: NZ_I18N, useValue: zh_TW },
    AppService,
    {
      provide: APP_INITIALIZER,
      useFactory: (appService: AppService) => appService.get_ui_record,
      deps: [AppService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
