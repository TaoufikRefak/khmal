import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Observable, timer, of } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';

export const noAuthGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ✅ Refresh authentication state first
  authService.refreshAuthState();

  return timer(500).pipe(
    // Short delay to allow state update
    switchMap(() => authService.isAuthenticated$),
    take(1),
    map((isAuthenticated) => {
      console.log('NoAuthGuard check:', isAuthenticated);
      return isAuthenticated ? router.parseUrl('/user/profile') : true;
    })
  );
};
