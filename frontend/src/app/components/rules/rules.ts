import { Component, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-rules',
  imports: [ CommonModule ],
  templateUrl: './rules.html',
  styleUrl:    './rules.css'
})
export class RulesComponent {

  isSmallScreenSize: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.updateScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.updateScreenSize();
  }

  private updateScreenSize(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isSmallScreenSize = window.innerWidth <= 555;
    }
  }
}