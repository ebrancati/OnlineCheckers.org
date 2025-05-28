import { Component } from '@angular/core';
import { OfflineBoardComponent } from '../../components/offline-board/offline-board.component';

@Component({
  selector: 'page-locale-player',
  standalone: true,
    imports: [
        OfflineBoardComponent,
    ],
  template: `
    <app-offline-board></app-offline-board>
  `
})
export class LocalePlayerPage {}