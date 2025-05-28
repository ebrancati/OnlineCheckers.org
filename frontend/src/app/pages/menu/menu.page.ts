import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'page-menu',
  templateUrl: './menu.page.html',
  imports: [TranslateModule],
  styleUrls: ['./menu.page.css']
})
export class MenuPage {
  selectedMode: string | null = null;

  constructor(private router: Router) {}

  selectMode(mode: string): void {
    this.selectedMode = mode;

    switch (mode) {
      case 'online':
        this.router.navigate(['/login']);
        break;
      case 'local':
        this.router.navigate(['/locale']);
        break;
      case 'bot':
        this.router.navigate(['/vs-bot']);
        break;
    }

    console.log('Selected mode:', mode);
  }
}