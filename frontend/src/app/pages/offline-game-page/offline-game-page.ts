import { Component } from '@angular/core';
import { OfflineBoardComponent } from '../../components/offline-board/offline-board';

@Component({
  selector: 'offline-game-page',
  imports: [ OfflineBoardComponent ],
  template: `<app-offline-board></app-offline-board>`
})
export class OfflineGamePage {}