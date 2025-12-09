import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// 這東西會害你全部東西都執行兩次!!!!!!!!
// const bootstrap = () => platformBrowserDynamic().bootstrapModule(AppModule);
//   bootstrap().catch(err => console.log(err));

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
