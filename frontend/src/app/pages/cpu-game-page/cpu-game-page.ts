import { Component } from '@angular/core';
import { BotBoardComponent } from '../../components/bot-board/bot-board';

@Component({
  selector: 'cpu-game-page',
  imports: [ BotBoardComponent ],
  template: '<app-bot-board></app-bot-board>',
})
export class CpuGamePage {}