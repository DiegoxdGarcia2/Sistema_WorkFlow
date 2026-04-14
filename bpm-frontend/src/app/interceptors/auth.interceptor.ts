import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const raw = localStorage.getItem('bpm_user');
  if (raw) {
    const user = JSON.parse(raw);
    req = req.clone({
      setHeaders: {
        'X-User-Id': user.id || '',
        'X-Tenant-Id': user.tenantId || '',
        'X-User-Rol': user.rol || '',
      },
    });
  }
  return next(req);
};
