import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'theme';
  private themeSubject = new BehaviorSubject<string>('light-theme');
  public theme$: Observable<string> = this.themeSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (!isPlatformBrowser(this.platformId)) return;

    const saved = localStorage.getItem(this.THEME_KEY);
    const initialTheme = saved === 'dark-theme' ? 'dark-theme' : 'light-theme';
    this.themeSubject.next(initialTheme);
    this.applyTheme(initialTheme);
  }

  public toggleTheme(): void {
    const current = this.themeSubject.value;
    const next = current === 'dark-theme' ? 'light-theme' : 'dark-theme';
    this.setTheme(next);
  }

  public setTheme(theme: string): void {
    if (theme !== 'light-theme' && theme !== 'dark-theme')
      return;

    if (isPlatformBrowser(this.platformId))
      localStorage.setItem(this.THEME_KEY, theme);

    this.themeSubject.next(theme);
    this.applyTheme(theme);
  }

  public getCurrentTheme(): string {
    return this.themeSubject.value;
  }

  public isDarkTheme(): boolean {
    return this.themeSubject.value === 'dark-theme';
  }

  private applyTheme(theme: string): void {
    
    if (!isPlatformBrowser(this.platformId)) return;

    const classList = document.documentElement.classList;
    classList.remove('light-theme', 'dark-theme');
    classList.add(theme);
  }
}