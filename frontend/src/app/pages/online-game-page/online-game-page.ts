import { Component } from '@angular/core';
import { OnlineBoardComponent } from '../../components/online-board/online-board';

@Component({
  selector: 'online-game-page',
  imports: [ OnlineBoardComponent ],
  template: `<app-online-board></app-online-board>`
})
export class OnlineGamePage {}