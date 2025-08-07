import { Component, OnInit, OnDestroy, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ThemeService } from '../../../services/theme-service';

@Component({
  selector: 'app-navbar',
  imports: [ CommonModule ],
  templateUrl: './navbar.html',
  styleUrl:    './navbar.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  nickname = '';
  isAdmin: boolean = false;
  currentTheme: string = 'light-theme';
  isDarkTheme: boolean = false;
  private themeSubscription: Subscription;
  private routerSubscription: Subscription;

  constructor(
    public router: Router,
    private themeService: ThemeService,
    @Inject(PLATFORM_ID) private platformId: Object
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
    if (!isPlatformBrowser(this.platformId)) return;

    const savedNickname = localStorage.getItem('nickname');
    if (savedNickname) this.nickname = savedNickname;
  }

  ngOnDestroy(): void {
    if (this.themeSubscription)  this.themeSubscription.unsubscribe();
    if (this.routerSubscription) this.routerSubscription.unsubscribe();
  }

  /**
   * Listen for clicks on the document to close navbar dropdown
   * @param event - The click event
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const target = event.target as HTMLElement;
    const navbarCollapse = document.querySelector('#navbarNav') as HTMLElement;
    const navbarToggler = document.querySelector('.navbar-toggler') as HTMLElement;
      
    // Check if navbar is currently open
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      // Check if click is outside navbar and not on the toggler button
      const isClickInsideNavbar = navbarCollapse.contains(target);
      const isClickOnToggler = navbarToggler && navbarToggler.contains(target);
        
      if (!isClickInsideNavbar && !isClickOnToggler) this.closeNavbarDropdown();
    }
  }

  /**
   * Get current language from URL path or domain/port
   * @returns 'it' for Italian, 'en' for English
   */
  getCurrentLanguage(): string {

    if (isPlatformBrowser(this.platformId))
      if (window.location.pathname.startsWith('/it')) return 'it';

    return 'en';
  }

  /**
   * Change language by updating the URL path
   * @param targetLang - Target language ('en' or 'it')
   */
  changeLanguage(targetLang: string): void {

    if (!isPlatformBrowser(this.platformId)) return;

    const currentPath   = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash   = window.location.hash;
      
    let newPath: string;
      
    if (targetLang === 'it') {
      // Convert to Italian URL
      if (currentPath.startsWith('/it/')) {
        return; // Already Italian, no change needed
      }
      else if (currentPath === '/it') {
        return; // Already Italian home, no change needed
      }
      else {
        newPath = this.convertPathToItalian(currentPath); // Convert English path to Italian
      }
    }
    else {
      // Convert to English URL
      if (currentPath.startsWith('/it/')) {
        const pathWithoutLocale = currentPath.substring(3); // Remove '/it'
        newPath = this.convertPathToEnglish(pathWithoutLocale);
      }
      else if (currentPath === '/it') {
        newPath = '/'; // Italian home to English home
      }
      else {
        return; // Already English, no change needed
      }
    }
      
    // Navigate to the new URL
    const newUrl = `${newPath}${currentSearch}${currentHash}`;
    this.router.navigateByUrl(newUrl);
  }

  /**
   * Convert English path to Italian equivalent
   * @param englishPath - Current English path
   * @returns Italian path with /it prefix
   */
  private convertPathToItalian(englishPath: string): string {
    // Map of English paths to Italian paths
    const pathMap: { [key: string]: string } = {
      '/': '/it',
      '/login': '/it/accedi',
      '/play/offline': '/it/gioca/offline',
      '/play/computer': '/it/gioca/computer',
      '/vs-bot': '/it/vs-bot',
      '/privacy-policy': '/it/privacy-policy'
    };
    
    // Handle dynamic routes with parameters
    if (englishPath.startsWith('/game/')) {
      const gameId = englishPath.split('/')[2];
      return `/it/partita/${gameId}`;
    }
    
    if (englishPath.startsWith('/join/')) {
      const gameId = englishPath.split('/')[2];
      return `/it/unisciti/${gameId}`;
    }
    
    // Return mapped path or default to /it + original path
    return pathMap[englishPath] || `/it${englishPath}`;
  }

  /**
   * Convert Italian path to English equivalent
   * @param italianPath - Current Italian path (without /it prefix)
   * @returns English path (without any prefix)
   */
  private convertPathToEnglish(italianPath: string): string {
    // Map of Italian paths to English paths (English has no prefix)
    const pathMap: { [key: string]: string } = {
      '': '/', // Empty string means home
      '/': '/',
      '/accedi': '/login',
      '/gioca/offline': '/play/offline',
      '/gioca/computer': '/play/computer',
      '/vs-bot': '/vs-bot',
      '/privacy-policy': '/privacy-policy'
    };
    
    // Handle dynamic routes with parameters
    if (italianPath.startsWith('/partita/')) {
      const gameId = italianPath.split('/')[2];
      return `/game/${gameId}`;
    }
    
    if (italianPath.startsWith('/unisciti/')) {
      const gameId = italianPath.split('/')[2];
      return `/join/${gameId}`;
    }
    
    // Return mapped path or default to original path (without /it prefix)
    return pathMap[italianPath] || italianPath || '/';
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Navigate to home page
   */
  navigateToHome(): void {
    const currentLang = this.getCurrentLanguage();
    const homePath = currentLang === 'it' ? '/it' : '/';
    this.router.navigate([homePath]);
  }

  /**
   * Navigate to home and scroll to rules section
   */
  navigateToRules(): void {

    this.closeNavbarDropdown();

    // Close navbar
    const navbarCollapse = document.querySelector('#navbarNav') as HTMLElement;
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      navbarCollapse.classList.remove('show');
    }
    
    const currentLang = this.getCurrentLanguage();
    const homePath = currentLang === 'it' ? '/it' : '/'; // English has no prefix
    const currentPath = this.router.url.split('#')[0]; // Remove any existing fragment
    
    if (currentPath === homePath) {
      // We're already on home page, just scroll directly to rules
      this.scrollToRulesSection();
      this.highlightRulesSection();
    }
    else {
      // Navigate to home page with rules fragment
      this.router.navigate([homePath], { fragment: 'rules' });
    }
  }

  /**
   * Navigate to home and scroll to top, then highlight game mode buttons
   */
  navigateToPlay(): void {

    this.closeNavbarDropdown();

    // Close navbar
    const navbarCollapse = document.querySelector('#navbarNav') as HTMLElement;

    if (navbarCollapse && navbarCollapse.classList.contains('show'))
      navbarCollapse.classList.remove('show');

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
   * Close navbar dropdown with Bootstrap animation
   */
  private closeNavbarDropdown(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const navbarCollapse = document.querySelector('#navbarNav') as HTMLElement;
    const navbarToggler = document.querySelector('.navbar-toggler') as HTMLElement;
      
    if (navbarCollapse && navbarCollapse.classList.contains('show')) navbarToggler?.click();
  }

  /**
   * Scroll smoothly to the top of the page
   */
  private scrollToTop(): void {
    if (!isPlatformBrowser(this.platformId)) return;

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
    
    const element = document.getElementById(fragment);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });

      this.highlightRulesSection();
    }
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
    const gameButtons = document.querySelectorAll('.button-background');
    gameButtons.forEach((button, index) => {
        button.classList.add('highlight-animation');
        
        // Remove the class after animation completes
        setTimeout(() => {
          button.classList.remove('highlight-animation');
        }, 1500);
    });
  }

  /**
   * Highlight rules section with animation effect
   */
  private highlightRulesSection(): void {
    setTimeout(() => {
      const rulesSection = document.querySelector('#rules .content-section') as HTMLElement;
      if (rulesSection) {
        rulesSection.classList.add('rules-highlight-animation');
        
        setTimeout(() => {
          rulesSection.classList.remove('rules-highlight-animation');
        }, 2000);
      }
    }, 500); // ensure scroll is complete
  }
}