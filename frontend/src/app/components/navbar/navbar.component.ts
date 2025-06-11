import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../services/language.service';
import { ThemeService } from '../../../services/theme.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrl:    './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  nickname = localStorage.getItem('nickname') ?? '';
  isAdmin: boolean = false;
  currentLang: string = 'it';
  currentTheme: string = 'light-theme';
  isDarkTheme: boolean = false;
  private langSubscription: Subscription;
  private themeSubscription: Subscription;
  private routerSubscription: Subscription;

  constructor(
    public router: Router,
    private languageService: LanguageService,
    private themeService: ThemeService
  ) {
    this.langSubscription = this.languageService.currentLang$.subscribe(
      lang => this.currentLang = lang
    );

    this.themeSubscription = this.themeService.theme$.subscribe(
      theme => {
        this.currentTheme = theme;
        this.isDarkTheme = theme === 'dark-theme';
      }
    );

    // Subscribe to router events to handle fragment navigation (only for rules)
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Check if there's a fragment to scroll to
      if (event.urlAfterRedirects.includes('#rules')) {
        const fragment = event.urlAfterRedirects.split('#')[1];
        if (fragment === 'rules') {
          this.scrollToFragment(fragment);
        }
      }
    });
  }

  ngOnInit(): void {
    const savedNickname = localStorage.getItem('nickname');
    if (savedNickname) {
      this.nickname = savedNickname;
    }
  }

  ngOnDestroy(): void {
    if (this.langSubscription) {
      this.langSubscription.unsubscribe();
    }
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  logout(): void {
    localStorage.removeItem('nickname');
    this.router.navigate(['/login']);
  }

  changeLanguage(lang: string): void {
    this.languageService.changeLanguage(lang);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Navigate to home page
   */
  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  /**
   * Navigate to home and scroll to rules section
   */
  navigateToRules(): void {
    this.router.navigate(['/'], { fragment: 'rules' });
  }

  /**
   * Navigate to home and highlight game mode buttons (without scrolling)
   */
  navigateToPlay(): void {
    // Check if we're already on home page
    if (this.router.url === '/' || this.router.url === '') {
      // Already on home, just trigger animation without navigation
      this.highlightGameModeButtons();
    } else {
      // Navigate to home first, then trigger animation
      this.router.navigate(['/']).then(() => {
        // Small delay to ensure page is loaded
        setTimeout(() => {
          this.highlightGameModeButtons();
        }, 100);
      });
    }
  }

  /**
   * Scroll to a specific fragment on the page
   */
  private scrollToFragment(fragment: string): void {
    // Only handle rules fragment, ignore any other fragments
    if (fragment !== 'rules') return;
    
    setTimeout(() => {
      const element = document.getElementById(fragment);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100); // Small delay to ensure DOM is ready
  }

  /**
   * Highlight game mode buttons with animation
   */
  private highlightGameModeButtons(): void {
    const gameButtons = document.querySelectorAll('.menu-button-custom');
    gameButtons.forEach((button, index) => {
      setTimeout(() => {
        button.classList.add('highlight-animation');
        
        // Remove the class after animation completes
        setTimeout(() => {
          button.classList.remove('highlight-animation');
        }, 1500);
      }, index * 200);
    });
  }
}