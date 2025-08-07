import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class I18nRouteService {

  private readonly routeMap = {
    en: {
      home: '/',
      login: '/login',
      'play-offline': '/play/offline',
      'play-computer': '/play/computer',
      'vs-bot': '/vs-bot',
      'privacy-policy': '/privacy-policy',
      game: '/game',
      join: '/join'
    },
    it: {
      home: '/it',
      login: '/it/accedi',
      'play-offline': '/it/gioca/offline',
      'play-computer': '/it/gioca/computer',
      'vs-bot': '/it/vs-bot',
      'privacy-policy': '/it/privacy-policy',
      game: '/it/partita',
      join: '/it/unisciti'
    }
  };

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /**
   * Get current language from URL path
   * @returns 'it' for Italian, 'en' for English (default)
   */
  getCurrentLanguage(): 'en' | 'it' {

    if (isPlatformBrowser(this.platformId)) {
      // Italian version uses /it prefix, English has no prefix
      return window.location.pathname.startsWith('/it') ? 'it' : 'en';
    }

    return 'en';
  }

  /**
   * Get localized route path
   * @param routeKey - Route identifier
   * @param params - Optional parameters for dynamic routes
   * @returns Localized route path
   */
  getRoute(routeKey: string, params?: { [key: string]: string }): string {
    const lang = this.getCurrentLanguage();
    let route = this.routeMap[lang][routeKey as keyof typeof this.routeMap[typeof lang]];
    
    if (!route) return '/';

    if (params) {
      Object.keys(params).forEach(key => {
        route = route.replace(`:${key}`, params[key]);
      });
    }

    return route;
  }

  /**
   * Navigate to a localized route
   * @param routeKey - Route identifier
   * @param params - Optional parameters for dynamic routes
   * @param options - Optional navigation extras
   */
  navigateTo(routeKey: string, params?: { [key: string]: string }, options?: any): void {
    const route = this.getRoute(routeKey, params);
    
    if (params && (routeKey === 'game' || routeKey === 'join')) {
      const routeParts = route.split('/');
      const paramValue = Object.values(params)[0];
      this.router.navigate([...routeParts.slice(0, -1), paramValue], options);
    } else {
      this.router.navigate([route], options);
    }
  }

  /**
   * Change language and navigate to equivalent page
   * @param targetLang - Target language
   */
  changeLanguage(targetLang: 'en' | 'it'): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const currentPath   = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash   = window.location.hash;
      
    if (this.getCurrentLanguage() === targetLang) return; // Already in target language

    // Find the route key for current path
    const currentLang = this.getCurrentLanguage();
    const currentRoutes = this.routeMap[currentLang];
      
    let targetRoute = '/';
      
    // Find matching route
    for (const [key, route] of Object.entries(currentRoutes)) {
      if (route === currentPath || currentPath.startsWith(route + '/')) {
        if (currentPath.startsWith(route + '/') && (key === 'game' || key === 'join')) {
          const param = currentPath.replace(route + '/', '');
          targetRoute = this.getRoute(key, { gameId: param });
        }
        else {
          targetRoute = this.getRoute(key);
        }
          
        break;
      }
    }

    // Navigate to target route
    const newUrl = `${targetRoute}${currentSearch}${currentHash}`;
    this.router.navigateByUrl(newUrl);
  }
}