import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLangSubject = new BehaviorSubject<string>('en'); // default english
  public currentLang$: Observable<string> = this.currentLangSubject.asObservable();

  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang('en'); // default english
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang && (savedLang === 'it' || savedLang === 'en')) {
      this.changeLanguage(savedLang);
    } else {
      const browserLang = this.translate.getBrowserLang();
      this.changeLanguage(browserLang && browserLang.match(/it|en/) ? browserLang : 'en'); // fallback to english
    }
  }

  public changeLanguage(lang: string): void {
    this.translate.use(lang);
    localStorage.setItem('preferredLanguage', lang);
    this.currentLangSubject.next(lang);
  }

  public getCurrentLang(): string {
    return this.currentLangSubject.value;
  }
}