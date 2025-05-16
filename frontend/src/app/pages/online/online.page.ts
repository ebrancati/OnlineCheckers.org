import { Component } from '@angular/core';
import {OnlineBoardComponent} from '../../components/online-board/online-board.component';

@Component({
  selector: 'page-online',
  standalone: true,
    imports: [
        OnlineBoardComponent,
    ],
  templateUrl: './online.page.html',
  styleUrl: './online.page.css'

})
export class OnlinePage {

}
