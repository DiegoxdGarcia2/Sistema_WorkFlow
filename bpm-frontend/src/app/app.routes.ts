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
    path: 'analytics',
    canActivate: [authGuard, roleGuard(['ADMINISTRADOR', 'DISENADOR'])],
    loadComponent: () => import('./pages/analytics-dashboard/analytics-dashboard.component').then(m => m.NlpAnalyticsDashboardComponent),
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
    canActivate: [authGuard, roleGuard(['ADMINISTRADOR', 'DISENADOR', 'FUNCIONARIO'])],
    loadComponent: () => import('./pages/funcionario/funcionario.component').then(m => m.FuncionarioComponent),
  },
  // ── Portal del Cliente (Público / Autenticado) ──
  {
    path: 'registro-cliente',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./pages/login/register-client.component').then(m => m.RegisterClientComponent),
  },
  {
    path: 'portal-cliente',
    canActivate: [authGuard, roleGuard(['CLIENTE'])],
    loadComponent: () => import('./pages/tracking/client-portal.component').then(m => m.ClientPortalComponent),
  },
  {
    path: 'tracking',
    loadComponent: () => import('./pages/tracking/tracking.component').then(m => m.TrackingComponent),
  },
  {
    path: 'tracking/:id',
    loadComponent: () => import('./pages/tracking/tracking.component').then(m => m.TrackingComponent),
  },
];
