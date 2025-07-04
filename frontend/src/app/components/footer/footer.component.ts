import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './footer.component.html',
  styleUrl:    './footer.component.css'
})
export class FooterComponent {

  constructor(private router: Router) {}

  developers = [
    {
      firstName: 'Enzo',
      lastName: 'Brancati',
      linkedin: 'https://www.linkedin.com/in/enzo-brancati-a2880520b/',
      email: 'enzo.brancati04@gmail.com'
    },
    {
      firstName: 'Daniele',
      lastName: 'Filareti',
      linkedin: 'https://www.linkedin.com/in/daniele-filareti-227a85257',
      email: 'daniele.filareti@icloud.com'
    },
    {
      firstName: 'Domenico',
      lastName: 'Farano',
      linkedin: 'https://www.linkedin.com/in/domenico-farano-418923285',
      email: 'dodo.farano@gmail.com'
    },
    {
      firstName: 'AnielloPio',
      lastName: 'Pentangelo',
      linkedin: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      email: 'aniellopiopentangelo2@gmail.com'
    }
  ];

  /**
   * Navigate to privacy policy and scroll to top
   */
  navigateToPrivacyPolicy(): void {
    if (this.router.url === '/privacy-policy') {
      // Already on the page, just scroll to top
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    } else {
      // Navigate to privacy policy, then scroll to top
      this.router.navigate(['/privacy-policy']).then(() => {
        setTimeout(() => {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
          });
        }, 100); // Delay to ensure page is loaded
      });
    }
  }
}