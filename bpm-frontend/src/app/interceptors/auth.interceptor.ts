import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor HTTP Enterprise:
 * 1. Adjunta el JWT Bearer token a cada request autenticado
 * 2. Detecta respuestas 401 (token expirado/inválido) y redirige a login
 * 3. No adjunta token a requests de autenticación (login/registro)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('bpm_token');
  
  // No adjuntar token a endpoints de auth (son públicos)
  const isAuthEndpoint = req.url.includes('/api/auth/');
  
  if (token && !isAuthEndpoint) {
    req = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expirado o inválido → limpiar y redirigir
        localStorage.removeItem('bpm_token');
        localStorage.removeItem('bpm_user');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
