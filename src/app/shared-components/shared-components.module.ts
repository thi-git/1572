import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// angular 元件
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// Material 元件
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTreeModule } from '@angular/material/tree';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
// ANT
import { NgZorroAntdModule } from "./zorro-antd/ng-zorro-antd.module";
// 樹狀套件
import { TreeviewModule } from 'ngx-treeview';
// leaflet
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
// google-map套件
import { AgmCoreModule } from '@agm/core';
// echarts
import { NgxEchartsModule } from 'ngx-echarts';
// 拖曳套件
import { SortablejsModule } from 'ngx-sortablejs';
// googleAPIKey
import { environment } from 'src/environments/environment';
// 動態
import { CustomHostDirective } from './custom-host.directive';
// 功能區塊
import { PermissionsComponent } from './permissions/permissions.component';
import { MainMapComponent } from "./main-map/main-map.component";
import { CheckboxTreeComponent } from './checkbox-tree/checkbox-tree.component';
import { MatInputModule } from '@angular/material/input';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MapControlComponent } from './map-control/map-control.component';
import { ExcelPreviewComponent } from './excel-preview/excel-preview.component';
import { FilterComponent } from './filter/filter.component';
import { SampleDownloadComponent } from './sample-download/sample-download.component';
import { DataTypeComponent } from './filter/component/data-type/data-type.component';
import { DataTypeMultipleComponent } from './filter/component/data-type-multiple/data-type-multiple.component';
import { TimeDateComponent } from './filter/component/time-date/time-date.component';
import { ExcelSelectComponent } from './filter/component/excel-select/excel-select.component';
import { DataListComponent } from './data-list/data-list.component';
import { IntersectionTypeComponent } from './filter/component/intersection-type/intersection-type.component';
import { EditArrowComponent } from './edit-arrow/edit-arrow.component';
import { MapEditComponent } from './map-edit/map-edit.component';
import { EditStepComponent } from './edit-step/edit-step.component';
import { MapAnalyzeComponent } from './map-analyze/map-analyze.component';
import { RoadGroupComponent } from './filter/component/road-group/road-group.component';
import { DataAnalyzeComponent } from './data-analyze/data-analyze.component';
import { EditParamsComponent } from './edit-params/edit-params.component';
import { DrawingInfoComponent } from './drawing-info/drawing-info.component';
import { MapSmallCardComponent } from './map-small-card/map-small-card.component';
import { TimeSelectComponent } from './filter/component/time-select/time-select.component';
import { OwnerNameComponent } from './filter/component/owner-name/owner-name.component';
import { ProjectNumberComponent } from './filter/component/project-number/project-number.component';
import { TcSelectComponent } from './filter/component/tc-select/tc-select.component';
import { HolidaySelectComponent } from './filter/component/holiday-select/holiday-select.component';
import { DbSearchFormComponent } from './db-search-form/db-search-form.component';
import { ListManageSubpageComponent } from './list-manage-subpage/list-manage-subpage.component';
import { DistrictComponent } from './filter/component/district/district.component';
import { ListOwnerFormComponent } from './list-owner-form/list-owner-form.component';
import { ListRoadFormComponent } from './list-road-form/list-road-form.component';
import { MapQualityComponent } from './map-quality/map-quality.component';
import { UploadResultComponent } from './upload-result/upload-result.component';
import { QualityBasicComponent } from './quality-basic/quality-basic.component';
import { QualitySettingComponent } from './quality-setting/quality-setting.component';
import { QualityResultComponent } from './quality-result/quality-result.component';
import { QualityStepComponent } from './filter/component/quality-step/quality-step.component';
import { SingleDateSelectComponent } from './filter/component/single-date-select/single-date-select.component';
import { SingleTimeSelectComponent } from './filter/component/single-time-select/single-time-select.component';
import { DiffPercentEditComponent } from './filter/component/diff-percent-edit/diff-percent-edit.component';
import { SingleDateComponent } from './filter/component/single-date/single-date.component';
import { TimeLineTemplateComponent } from './time-line-template/time-line-template.component';
import { CityAllComponent } from './filter/component/city-all/city-all.component';
import { CityUploadComponent } from './filter/component/city-upload/city-upload.component';

export const TW_FORMATS = {
  parse: {
    dateInput: 'YYYY-MM-DD'
  },
  display: {
    dateInput: 'YYYY-MM-DD',
    monthYearLabel: 'YYYY MMM',
    dateA11yLabel: 'YYYY-MM-DD',
    monthYearA11yLabel: 'YYYY MMM'
  }
};

@NgModule({
  declarations: [
    CustomHostDirective,
    MainMapComponent,
    CheckboxTreeComponent,
    MapControlComponent,
    ExcelPreviewComponent,
    FilterComponent,
    DataTypeComponent,
    TimeDateComponent,
    DataListComponent,
    ExcelSelectComponent,
    DataTypeMultipleComponent,
    SampleDownloadComponent,
    IntersectionTypeComponent,
    EditArrowComponent,
    MapEditComponent,
    EditStepComponent,
    MapAnalyzeComponent,
    RoadGroupComponent,
    DataAnalyzeComponent,
    EditParamsComponent,
    DrawingInfoComponent,
    MapSmallCardComponent,
    TimeSelectComponent,
    OwnerNameComponent,
    ProjectNumberComponent,
    TcSelectComponent,
    HolidaySelectComponent,
    DbSearchFormComponent,
    ListManageSubpageComponent,
    DistrictComponent,
    ListOwnerFormComponent,
    ListRoadFormComponent,
    MapQualityComponent,
    UploadResultComponent,
    QualityBasicComponent,
    QualitySettingComponent,
    QualityResultComponent,
    QualityStepComponent,
    SingleDateSelectComponent,
    SingleTimeSelectComponent,
    DiffPercentEditComponent,
    SingleDateComponent,
    TimeLineTemplateComponent,
    PermissionsComponent,
    CityAllComponent,
    CityUploadComponent,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'zh-TW' },
    { provide: MAT_DATE_FORMATS, useValue: TW_FORMATS }
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
    MatCheckboxModule,
    MatTreeModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    DragDropModule,
    NgZorroAntdModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatSelectModule,
    MatListModule,
    MatButtonToggleModule,
    NgxMatTimepickerModule,
    MatRadioModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatExpansionModule,
    MatDividerModule,
    MatTabsModule,
    LeafletModule,
    SortablejsModule,
    TreeviewModule.forRoot(),
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts')
    }),
    AgmCoreModule.forRoot({
      apiKey: environment.googleAPIKey
    })
  ],
  exports: [
    CustomHostDirective,
    MainMapComponent,
    CheckboxTreeComponent,
    MapControlComponent,
    ExcelPreviewComponent,
    FilterComponent,
    DataTypeComponent,
    DataListComponent,
    SampleDownloadComponent,
    EditArrowComponent,
    NgZorroAntdModule,
    PermissionsComponent
  ]
})
export class SharedComponentsModule { }
