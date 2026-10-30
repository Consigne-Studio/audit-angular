export const routes = [{ path: '', loadComponent: () => import('./compteur.component').then((m) => m.CompteurComponent) }];
