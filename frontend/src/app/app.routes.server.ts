import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dynamic routes using SSR
  {
    path: 'game/:gameId',
    renderMode: RenderMode.Server
  },
  {
    path: 'join/:gameId',
    renderMode: RenderMode.Server
  },
 
  // prerender all other routes
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];