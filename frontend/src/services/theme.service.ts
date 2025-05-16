import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'theme';
  private themeSubject = new BehaviorSubject<string>(this.getInitialTheme());
  public theme$: Observable<string> = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
  }

  private getInitialTheme(): string {
    // Check if theme is stored in localStorage
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    if (savedTheme && (savedTheme === 'light-theme' || savedTheme === 'dark-theme')) {
      return savedTheme;
    }

    // If no saved theme, use light theme as default
    return 'light-theme';
  }

  public toggleTheme(): void {
    const currentTheme = this.themeSubject.value;
    const newTheme = currentTheme === 'light-theme' ? 'dark-theme' : 'light-theme';
    this.setTheme(newTheme);
  }

  public setTheme(theme: string): void {
    if (theme !== 'light-theme' && theme !== 'dark-theme') {
      return;
    }

    localStorage.setItem(this.THEME_KEY, theme);
    this.themeSubject.next(theme);
    this.applyTheme(theme);
  }

  public getCurrentTheme(): string {
    return this.themeSubject.value;
  }

  private applyTheme(theme: string): void {
    // Remove any existing theme classes
    document.body.classList.remove('light-theme', 'dark-theme');
    // Add the new theme class
    document.body.classList.add(theme);
  }

  public isDarkTheme(): boolean {
    return this.themeSubject.value === 'dark-theme';
  }
}
