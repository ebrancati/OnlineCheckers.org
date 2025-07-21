import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../services/theme.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl:    './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  nickname = localStorage.getItem('nickname') ?? '';
  isAdmin: boolean = false;
  currentTheme: string = 'light-theme';
  isDarkTheme: boolean = false;
  private themeSubscription: Subscription;
  private routerSubscription: Subscription;

  constructor(
    public router: Router,
    private themeService: ThemeService
  ) {
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
    if (savedNickname) this.nickname = savedNickname;
  }

  ngOnDestroy(): void {
    if (this.themeSubscription)  this.themeSubscription.unsubscribe();
    if (this.routerSubscription) this.routerSubscription.unsubscribe();
  }

  logout(): void {
    localStorage.removeItem('nickname');
    this.router.navigate(['/login']);
  }

  /**
   * Redirect to appropriate domain
   */
  changeLanguage(targetLang: string): void {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;
    
    let targetUrl: string;
    if (targetLang === 'it') {
      targetUrl = `https://it.onlinecheckers.org${currentPath}${currentSearch}${currentHash}`;
    } else {
      targetUrl = `https://onlinecheckers.org${currentPath}${currentSearch}${currentHash}`;
    }
    
    window.location.href = targetUrl;
  }

  /**
   * Get current language from domain
   */
  getCurrentLanguage(): string {
    return window.location.hostname === 'it.onlinecheckers.org' ? 'it' : 'en';
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
    // Close navbar manually, whitout bootstrap
    const navbarCollapse = document.querySelector('#navbarNav') as HTMLElement;

    if (navbarCollapse && navbarCollapse.classList.contains('show'))
      navbarCollapse.classList.remove('show');
    
    if (this.router.url === '/' || this.router.url === '' || this.router.url.includes('#'))
      this.scrollToRulesSection(); // We're already on home page, just scroll directly to rules
    else
      this.router.navigate(['/'], { fragment: 'rules' }); // Navigate to home page with rules fragment
  }

  /**
   * Navigate to home and scroll to top, then highlight game mode buttons
   */
  navigateToPlay(): void {
    // Check if we're already on home page
    if (this.router.url === '/' || this.router.url === '') {

      this.scrollToTop();

      setTimeout(() => {
        this.highlightGameModeButtons();
      }, 300); // ensure scroll is complete
    }
    else {
      // Navigate to home first, then scroll to top and trigger animation
      this.router.navigate(['/']).then(() => {

        setTimeout(() => {
          this.scrollToTop();
          
          setTimeout(() => {
            this.highlightGameModeButtons();
          }, 300); // ensure scroll is complete
        }, 100); // ensure page is loaded
      });
    }
  }

  /**
   * Scroll smoothly to the top of the page
   */
  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
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
    }, 300); // ensure DOM is ready
  }

  private scrollToRulesSection(): void {
    setTimeout(() => {
      const element = document.getElementById('rules');
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100); // delay to let navbar close if open
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