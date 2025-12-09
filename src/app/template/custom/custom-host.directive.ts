import { Directive, ViewContainerRef } from '@angular/core';



@Directive({
  selector: '[appDynamicComponentHost]',
})
export class CustomHostDirective {
  public viewContainerRef = this._viewContainerRef;
  constructor(private _viewContainerRef: ViewContainerRef) { }
  public component_map = {}
}
