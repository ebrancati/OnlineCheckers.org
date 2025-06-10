import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../services/language.service';
import { ThemeService } from '../../../services/theme.service';
import { Subscription } from 'rxjs';

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
}
