import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy-policy-page.component.html',
})
export class PrivacyPolicyPage {
  lastUpdated = new Date('2025-06-12');
}