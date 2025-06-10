import { Component } from '@angular/core';
import { BotBoardComponent } from '../../components/bot-board/bot-board.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'cpu-game-page',
  standalone: true,
  imports: [
    BotBoardComponent,
    TranslateModule
  ],
  template: '<app-bot-board></app-bot-board>',
})
export class CpuGamePage {}