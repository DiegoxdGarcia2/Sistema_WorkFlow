import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { loggedInGuard } from './guards/logged-in.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'registro',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./pages/register-tenant/register-tenant.component').then(m => m.RegisterTenantComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['ADMINISTRADOR'])],
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'designer',
    canActivate: [authGuard, roleGuard(['ADMINISTRADOR', 'DISENADOR'])],
    loadComponent: () => import('./pages/designer/projects-hub.component').then(m => m.ProjectsHubComponent),
  },
  {
    path: 'designer/editor',
    canActivate: [authGuard, roleGuard(['ADMINISTRADOR', 'DISENADOR'])],
    loadComponent: () => import('./pages/designer/designer.component').then(m => m.DesignerComponent),
  },
  {
    path: 'funcionario',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/funcionario/funcionario.component').then(m => m.FuncionarioComponent),
  },
  // ── Portal del Cliente (público, sin autenticación) ──
  {
    path: 'tracking',
    loadComponent: () => import('./pages/tracking/tracking.component').then(m => m.TrackingComponent),
  },
  {
    path: 'tracking/:id',
    loadComponent: () => import('./pages/tracking/tracking.component').then(m => m.TrackingComponent),
  },
];
