import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  // Developer information
  developers = [
    {
      name: 'Enzo Brancati',
      linkedin: 'https://www.linkedin.com/in/enzo-brancati-a2880520b/',
      email: 'enzo.brancati04@gmail.com'
    },
    {
      name: 'Daniele Filareti',
      linkedin: 'https://www.linkedin.com/in/daniele-filareti-227a85257',
      email: 'daniele.filareti@icloud.com'
    },
    {
      name: 'Domenico Farano',
      linkedin: 'https://www.linkedin.com/in/domenico-farano-418923285',
      email: 'dodo.farano@gmail.com'
    },
    {
      name: 'AnielloPio Pentangelo',
      linkedin: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      email: 'aniellopiopentangelo2@gmail.com'
    }
  ];
}
