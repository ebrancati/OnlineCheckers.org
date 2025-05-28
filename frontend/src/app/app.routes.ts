import { Routes } from '@angular/router';

import { RulesContentPage } from './pages/rules-content/rules-content.page';
import { MenuPage }         from './pages/menu/menu.page';
import { OnlinePage }       from './pages/online/online.page';
import { LocalePlayerPage } from './pages/locale-player/locale-player.page';
import { BotPlayerPage }    from './pages/bot-player/bot-player.page';
import { LoginPage }        from './pages/login/login.page';
import { JoinPage }         from './pages/join/join.page';

export const routes: Routes = [
  { path: '', redirectTo: '/play', pathMatch: 'full' },

  { path: 'play',         component: MenuPage },
  { path: 'rules',        component: RulesContentPage },
  { path: 'login',        component: LoginPage },
  { path: 'game/:gameId', component: OnlinePage },
  { path: 'locale',       component: LocalePlayerPage },
  { path: 'vs-bot',       component: BotPlayerPage },
  { path: 'join/:gameId', component: JoinPage },

  { path: '**', redirectTo: '/play' },
];