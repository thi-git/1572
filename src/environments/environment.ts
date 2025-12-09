// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  hmr: false,

  // 測試區
  serverIP: 'http://220.130.185.37/1493/TFA',
  authIP: 'http://220.130.185.37/dev_auth2',
  googleAPIKey: 'AIzaSyC1Vss9QPHmf7m3C9Iv9ZOaLxt6YcdpoC0',

  // 本地端
  // serverIP: 'http://127.0.0.1:11493',
  // authIP: 'http://220.130.185.37/dev_auth2',
  // googleAPIKey: 'AIzaSyDMA3xP8O4r6JEpurWrlattMSK8Nf33Y68',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
