import { NgModule } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';

import { HeaderModule } from './header/header.module';
import { SidebarComponent } from './sidebar/sidebar.component';
import { FooterModule } from './footer/footer.module';
import { LayoutComponent } from './layout/layout.component';

import { SharedComponentsModule } from "../shared-components/shared-components.module";

@NgModule({
  declarations: [
    SidebarComponent,
    LayoutComponent,
  ],
  imports: [
    HeaderModule,
    FooterModule,
    MatListModule,
    MatIconModule,
    RouterModule,
    MatButtonModule,
    CommonModule,
    MatMenuModule,
    MatSelectModule,
    FormsModule,
    MatSidenavModule,
    SharedComponentsModule,
  ],
  exports: [
    HeaderModule,
    SidebarComponent,
    FooterModule,
    LayoutComponent
  ]
})
export class LayoutsModule { }
