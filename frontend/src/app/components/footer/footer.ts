import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrl:    './footer.css'
})
export class FooterComponent {

  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

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
      firstName: 'Aniello Pio',
      lastName: 'Pentangelo',
      email: 'aniellopiopentangelo2@gmail.com'
    }
  ];

  /**
   * Navigate to privacy policy and scroll to top
   */
  navigateToPrivacyPolicy(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.router.url === '/privacy-policy') {
      // Already on the page, just scroll to top
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }
    else {
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