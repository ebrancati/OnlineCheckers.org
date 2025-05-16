import { Component } from '@angular/core';
import {OfflineBoardComponent} from '../../components/offline-board/offline-board.component';

@Component({
  selector: 'page-locale-player',
  standalone: true,
    imports: [
        OfflineBoardComponent,
    ],
  templateUrl: './locale-player.page.html',
  styleUrl: './locale-player.page.css'
})
export class LocalePlayerPage {}