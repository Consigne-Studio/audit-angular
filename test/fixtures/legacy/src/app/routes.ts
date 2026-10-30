import { ListeComponent } from './liste.component';
export const routes = [
  { path: 'a', component: ListeComponent }, { path: 'b', component: ListeComponent }, { path: 'c', component: ListeComponent },
  { path: 'd', component: ListeComponent }, { path: 'e', loadChildren: () => import('./store').then((m) => m.Store) },
];
