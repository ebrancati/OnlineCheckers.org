import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [TranslateModule, CommonModule],
  templateUrl: './rules.component.html',
  styleUrl:    './rules.component.css'
})
export class RulesComponent {}
