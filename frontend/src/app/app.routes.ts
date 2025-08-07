import { Routes } from '@angular/router';
import { MenuPage }          from './pages/menu-page/menu-page';
import { LoginPage }         from './pages/login-page/login-page';
import { OnlineGamePage }    from './pages/online-game-page/online-game-page';
import { OfflineGamePage }   from './pages/offline-game-page/offline-game-page';
import { CpuGamePage }       from './pages/cpu-game-page/cpu-game-page';
import { JoinPage }          from './pages/join-page/join-page';
import { PrivacyPolicyPage } from './pages/privacy-policy-page/privacy-policy-page';

export const routes: Routes = [

  { path: '',               component: MenuPage },
  { path: 'login',          component: LoginPage },
  { path: 'game/:gameId',   component: OnlineGamePage },
  { path: 'play/offline',   component: OfflineGamePage },
  { path: 'play/computer',  component: CpuGamePage },
  { path: 'vs-bot',         component: CpuGamePage },
  { path: 'join/:gameId',   component: JoinPage },
  { path: 'privacy-policy', component: PrivacyPolicyPage },
 
  // Fallback route
  { path: '**', redirectTo: '' },
];