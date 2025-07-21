import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { RulesComponent } from '../../components/rules/rules.component';

@Component({
  selector: 'menu-page',
  standalone: true,
  imports: [RulesComponent],
  templateUrl: './menu-page.component.html',
  styleUrl:    './menu-page.component.css'
})
export class MenuPage implements OnInit {
  selectedMode: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // If there is fragment '#rules' in the URL, scroll to rules section
    const fragment = this.route.snapshot.fragment;
    if (fragment === 'rules') {
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