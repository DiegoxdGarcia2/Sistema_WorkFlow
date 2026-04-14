import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register-tenant/register-tenant.component').then(m => m.RegisterTenantComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'designer',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/designer/designer.component').then(m => m.DesignerComponent),
  },
  {
    path: 'funcionario',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/funcionario/funcionario.component').then(m => m.FuncionarioComponent),
  },
];
