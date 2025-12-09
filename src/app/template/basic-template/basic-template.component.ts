import { Component, OnInit, OnDestroy } from '@angular/core';

// rxjs調用
import { ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-basic-template',
  templateUrl: './basic-template.component.html',
  styleUrls: ['./basic-template.component.scss']
})
export class BasicTemplateComponent implements OnInit, OnDestroy {

  constructor() { }
  public destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

}
