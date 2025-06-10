import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RulesComponent } from '../../components/rules/rules.component';

@Component({
  selector: 'menu-page',
  standalone: true,
  imports: [RulesComponent ,TranslateModule],
  templateUrl: './menu-page.component.html',
  styleUrl:    './menu-page.component.css'
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
        this.router.navigate(['/play/offline']);
        break;
      case 'bot':
        this.router.navigate(['/play/computer']);
        break;
    }

    console.log('Selected mode:', mode);
  }
}