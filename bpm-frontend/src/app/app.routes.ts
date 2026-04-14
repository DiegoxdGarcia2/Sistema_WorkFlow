import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'funcionario',
    pathMatch: 'full',
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
