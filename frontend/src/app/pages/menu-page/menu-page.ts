import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RulesComponent } from '../../components/rules/rules';

@Component({
  selector: 'menu-page',
  imports: [ RulesComponent ],
  templateUrl: './menu-page.html',
  styleUrl:    './menu-page.css'
})
export class MenuPage implements OnInit {
  selectedMode: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    // If there is fragment '#rules' in the URL, scroll to rules section
    const fragment = this.route.snapshot.fragment;
    if (fragment === 'rules' && isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        document.getElementById('rules')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start' 
        });
      }, 100);
    }
  }

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
  }
}