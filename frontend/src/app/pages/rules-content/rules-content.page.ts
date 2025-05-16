import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'page-rules-content',
  standalone: true,
  imports: [TranslateModule, CommonModule],
  templateUrl: './rules-content.page.html',
  styleUrl: './rules-content.page.css'
})
export class RulesContentPage {}
