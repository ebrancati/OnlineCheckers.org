import { Component } from '@angular/core';
import { OnlineBoardComponent } from '../../components/online-board/online-board.component';

@Component({
  selector: 'online-game-page',
  standalone: true,
  imports: [OnlineBoardComponent],
  template: `
    <app-online-board></app-online-board>
  `
})
export class OnlineGamePage {}