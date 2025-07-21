import { Component } from '@angular/core';
import { BotBoardComponent } from '../../components/bot-board/bot-board.component';

@Component({
  selector: 'cpu-game-page',
  standalone: true,
  imports: [BotBoardComponent],
  template: '<app-bot-board></app-bot-board>',
})
export class CpuGamePage {}