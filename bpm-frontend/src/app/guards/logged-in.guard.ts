import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const loggedInGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaLogueado()) {
    const user = auth.usuario();
    const rutas: Record<string, string> = {
      ADMINISTRADOR: '/admin',
      DISENADOR: '/designer',
      FUNCIONARIO: '/funcionario',
      CLIENTE: '/funcionario',
    };
    router.navigate([rutas[user?.rol || ''] || '/funcionario']);
    return false;
  }

  return true;
};
