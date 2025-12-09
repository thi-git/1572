import { Directive, ViewContainerRef } from '@angular/core';
// Filter 元件
import { DataTypeComponent } from "./filter/component/data-type/data-type.component";
import { DataTypeMultipleComponent } from './filter/component/data-type-multiple/data-type-multiple.component';
import { TimeDateComponent } from "./filter/component/time-date/time-date.component";
import { ExcelSelectComponent } from "./filter/component/excel-select/excel-select.component";
import { IntersectionTypeComponent } from './filter/component/intersection-type/intersection-type.component';
import { RoadGroupComponent } from './filter/component/road-group/road-group.component';
import { TimeSelectComponent } from './filter/component/time-select/time-select.component';
import { OwnerNameComponent } from './filter/component/owner-name/owner-name.component';
import { ProjectNumberComponent } from './filter/component/project-number/project-number.component';
import { TcSelectComponent } from './filter/component/tc-select/tc-select.component';
import { HolidaySelectComponent } from './filter/component/holiday-select/holiday-select.component';
import { DistrictComponent } from './filter/component/district/district.component';
import { QualityStepComponent } from './filter/component/quality-step/quality-step.component';
import { SingleDateSelectComponent } from './filter/component/single-date-select/single-date-select.component';
import { SingleTimeSelectComponent } from './filter/component/single-time-select/single-time-select.component';
import { DiffPercentEditComponent } from './filter/component/diff-percent-edit/diff-percent-edit.component';
import { CityAllComponent } from './filter/component/city-all/city-all.component';
import { CityUploadComponent } from './filter/component/city-upload/city-upload.component';

// 頁面元件
import { FilterComponent } from "./filter/filter.component";
import { ExcelPreviewComponent } from "./excel-preview/excel-preview.component";
import { MainMapComponent } from "./main-map/main-map.component";
import { DataListComponent } from './data-list/data-list.component';
import { SampleDownloadComponent } from './sample-download/sample-download.component';
import { MapControlComponent } from './map-control/map-control.component';
import { MapEditComponent } from './map-edit/map-edit.component';
import { MapAnalyzeComponent } from './map-analyze/map-analyze.component';
import { EditArrowComponent } from './edit-arrow/edit-arrow.component';
import { EditStepComponent } from './edit-step/edit-step.component';
import { DataAnalyzeComponent } from './data-analyze/data-analyze.component';
import { EditParamsComponent } from './edit-params/edit-params.component';
import { DrawingInfoComponent } from './drawing-info/drawing-info.component';
import { DbSearchFormComponent } from './db-search-form/db-search-form.component';
import { ListManageSubpageComponent } from './list-manage-subpage/list-manage-subpage.component';
import { ListOwnerFormComponent } from './list-owner-form/list-owner-form.component';
import { ListRoadFormComponent } from './list-road-form/list-road-form.component';
import { MapQualityComponent } from './map-quality/map-quality.component';
import { UploadResultComponent } from './upload-result/upload-result.component';
import { QualityBasicComponent } from './quality-basic/quality-basic.component';
import { QualitySettingComponent } from './quality-setting/quality-setting.component';
import { QualityResultComponent } from './quality-result/quality-result.component';
import { SingleDateComponent } from './filter/component/single-date/single-date.component';

@Directive({
  selector: '[appDynamicComponentHost]',
})
export class CustomHostDirective {
  public viewContainerRef = this._viewContainerRef;
  constructor(private _viewContainerRef: ViewContainerRef) { }
  public component_map = {
    // Filter
    "DataType" : DataTypeComponent,
    "DataTypeMultiple" : DataTypeMultipleComponent,
    "TimeDate" : TimeDateComponent,
    "ExcelSelect" : ExcelSelectComponent,
    "IntersectionType" : IntersectionTypeComponent,
    "TimeSelect" : TimeSelectComponent,
    "OwnerName": OwnerNameComponent,
    "ProjectNumber": ProjectNumberComponent,
    "TcSelect": TcSelectComponent,
    "HolidaySelect": HolidaySelectComponent,
    "District": DistrictComponent,
    "QualityStep": QualityStepComponent,
    "SingleDate": SingleDateComponent,
    // Page
    "Filter" : FilterComponent,
    "ExcelPreview" : ExcelPreviewComponent,
    "MainMap" : MainMapComponent,
    "DataList": DataListComponent,
    "SampleDownload" : SampleDownloadComponent,
    'MapControl': MapControlComponent,
    'MapEdit': MapEditComponent,
    'EditArrow': EditArrowComponent,
    'EditStep': EditStepComponent,
    'MapAnalyze': MapAnalyzeComponent,
    'RoadGroup': RoadGroupComponent,
    'DataAnalyze': DataAnalyzeComponent,
    'EditParams': EditParamsComponent,
    'DrawingInfo': DrawingInfoComponent,
    'DbSearchForm': DbSearchFormComponent,
    'ListManageSubpage':ListManageSubpageComponent,
    'ListOwnerForm':ListOwnerFormComponent,
    'ListRoadForm':ListRoadFormComponent,
    'MapQuality': MapQualityComponent,
    'UploadResult': UploadResultComponent,
    'QualityBasic': QualityBasicComponent,
    'QualitySetting': QualitySettingComponent,
    'QualityResult': QualityResultComponent,
    'SingleDateSelect': SingleDateSelectComponent,
    'SingleTimeSelect': SingleTimeSelectComponent,
    'DiffPercentEdit': DiffPercentEditComponent,
    'CityAll': CityAllComponent,
    'CityUpload': CityUploadComponent
  }
}
