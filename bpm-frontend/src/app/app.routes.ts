import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'funcionario',
    pathMatch: 'full',
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'designer',
    loadComponent: () =>
      import('./pages/designer/designer.component').then(m => m.DesignerComponent),
  },
  {
    path: 'funcionario',
    loadComponent: () =>
      import('./pages/funcionario/funcionario.component').then(m => m.FuncionarioComponent),
  },
];
