import { Component, OnInit } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { CenterService } from './pages/center.service';
import { routes } from './routes';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public routers: typeof routes = routes;
  theme = 'dark-theme';
  subTheme = 'blue-theme';

  constructor(
    private overlayContainer: OverlayContainer,
    private centerService: CenterService
  ) {}

  ngOnInit() {
    this.centerService.theme$.subscribe(theme=>{
      this.toggleTheme(theme);
    })
    this.overlayContainer.getContainerElement().classList.add(this.theme);
  }

  toggleTheme(newTheme) {
    this.overlayContainer.getContainerElement().classList.remove(this.theme);
    this.overlayContainer.getContainerElement().classList.add(newTheme);
    this.theme = newTheme;
  }
}
