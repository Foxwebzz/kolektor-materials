import { trigger, transition, animate, style } from '@angular/animations';

export const enterLeaveHeightAnimation: any = trigger('enterLeaveHeightAnimation', [
  transition(':enter', [
    style({
      opacity: 0,
      height: 0,
    }),
    animate(
      '.3s ease-in-out',
      style({
        opacity: 1,
        height: '*',
      })
    ),
  ]),
  transition(':leave', [
    animate(
      '.2s ease-in-out',
      style({
        opacity: 0,
        height: 0,
      })
    ),
  ]),
]);
