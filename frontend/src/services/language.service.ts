import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLangSubject = new BehaviorSubject<string>('it');
  public currentLang$: Observable<string> = this.currentLangSubject.asObservable();

  constructor(private translate: TranslateService) {
    // Imposta la lingua di default
    this.translate.setDefaultLang('it');
    
    // Rileva la lingua dal sottodominio
    const hostname = window.location.hostname;
    let detectedLang: string | null = null;
    
    if (hostname.startsWith('it.')) {
      detectedLang = 'it';
    } else if (hostname.startsWith('en.')) {
      detectedLang = 'en';
    }
    
    // Se la lingua è stata rilevata dal sottodominio, usala
    if (detectedLang) {
      this.translate.use(detectedLang);
      localStorage.setItem('preferredLanguage', detectedLang);
      this.currentLangSubject.next(detectedLang);
      return;
    }
    
    // Altrimenti continua con la logica esistente...
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang && (savedLang === 'it' || savedLang === 'en')) {
      this.changeLanguage(savedLang);
    } else {
      const browserLang = this.translate.getBrowserLang();
      this.changeLanguage(browserLang && browserLang.match(/it|en/) ? browserLang : 'it');
    }
  }

  public changeLanguage(lang: string): void {
    this.translate.use(lang);
    localStorage.setItem('preferredLanguage', lang);
    this.currentLangSubject.next(lang);
    
    // Correggi la logica di reindirizzamento al sottodominio
    const currentUrl = new URL(window.location.href);
    const hostnameParts = currentUrl.hostname.split('.');
    
    // Se siamo in localhost o in un IP
    if (hostnameParts.includes('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(currentUrl.hostname)) {
      // In ambiente di sviluppo, solo aggiorna la lingua senza cambiare dominio
      console.log('Ambiente di sviluppo rilevato, cambio lingua senza reindirizzamento');
      return;
    }
    
    // Per domini reali, gestisci i sottodomini correttamente
    // Rimuovi qualsiasi sottodominio di lingua esistente (it, en)
    let newHostname;
    if (hostnameParts.length > 2) {
      // Potrebbe avere già sottodomini
      if (['it', 'en'].includes(hostnameParts[0])) {
        // Rimuove il primo elemento (sottodominio di lingua)
        hostnameParts.shift();
      }
    }
    
    // Aggiungi il nuovo sottodominio di lingua
    newHostname = [lang, ...hostnameParts].join('.');
    
    // Solo se il dominio è effettivamente cambiato, reindirizza
    if (newHostname !== currentUrl.hostname) {
      currentUrl.hostname = newHostname;
      window.location.href = currentUrl.toString();
    }
  }

  public getCurrentLang(): string {
    return this.currentLangSubject.value;
  }
}