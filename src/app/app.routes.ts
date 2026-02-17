import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./components/login/login').then(m => m.LoginComponent) },
  { path: '', loadComponent: () => import('./components/home/home').then(m => m.HomeComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
