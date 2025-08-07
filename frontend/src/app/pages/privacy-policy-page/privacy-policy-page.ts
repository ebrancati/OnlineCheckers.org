import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy-policy',
  imports: [ CommonModule ],
  templateUrl: './privacy-policy-page.html',
})
export class PrivacyPolicyPage {
  lastUpdated = new Date('2025-06-12');
}