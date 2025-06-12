import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './privacy-policy-page.component.html',
  //styleUrl: './privacy-policy-page.component.css'
})
export class PrivacyPolicyPage {
  lastUpdated = new Date('2025-06-12');
}