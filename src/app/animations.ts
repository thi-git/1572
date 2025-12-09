// angular 動畫
import {
  trigger,
  query,
  style,
  animate,
  transition,
  group,
  // ...
} from '@angular/animations';

export const slideInAnimation =
  trigger('routeAnimations', [
//     // transition('* <=> *', [
//     //   style({ position: 'relative' }),
//     //   query(':enter, :leave', [
//     //     style({
//     //       position: 'absolute',
//     //       top: 0,
//     //       left: 0,
//     //       width: '100%'
//     //     })
//     //   ], { optional: true }),
//     //   query(':enter', [
//     //     style({ left: '-100%' })
//     //   ], { optional: true }),
//     //   query(':leave', animateChild(), { optional: true }),
//     //   group([
//     //     query(':leave', [
//     //       animate('300ms ease-out', style({ left: '100%' }))
//     //     ], { optional: true }),
//     //     query(':enter', [
//     //       animate('300ms ease-out', style({ left: '0%' }))
//     //     ], { optional: true })
//     //   ]),
//     //   query(':enter', animateChild(), { optional: true }),
//     // ]),
    transition('* <=> *', [
      // style({ position: 'relative' }),
      group([
        query(':enter, :leave', style({ position: 'fixed', width:'calc(100% - 80px)', height:'100%'})
        , { optional: true }),
        query(':enter', [
          style({ transform: 'translateX(100%)' }),
          animate('0.8s ease-in-out', style({ transform: 'translateX(0%)' }))
        ], { optional: true }),
        query(':leave', [
          style({ transform: 'translateX(0%)' }),
          animate('0.8s ease-in-out', style({ transform: 'translateX(-100%)' }))
        ], { optional: true }),
      ])
    ])
  ]);

