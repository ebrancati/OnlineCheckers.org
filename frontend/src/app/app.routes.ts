import { Routes } from '@angular/router';

import { MenuPage }        from './pages/menu-page/menu-page.component';
import { OnlineGamePage }  from './pages/online-game-page/online-game-page.component';
import { OfflineGamePage } from './pages/offline-game-page/offline-game-page.component';
import { CpuGamePage }     from './pages/cpu-game-page/cpu-game-page.component';
import { LoginPage }       from './pages/login-page/login-page.component';
import { JoinPage }        from './pages/join-page/join-page.component';

export const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full' },

  { path: '',              component: MenuPage },
  { path: 'login',         component: LoginPage },
  { path: 'game/:gameId',  component: OnlineGamePage },
  { path: 'play/offline',  component: OfflineGamePage },
  { path: 'play/computer', component: CpuGamePage },
  { path: 'vs-bot',        component: CpuGamePage },
  { path: 'join/:gameId',  component: JoinPage },

  { path: '**', redirectTo: '' },
];