import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Observable, timer, of } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ✅ Refresh authentication state first
  authService.refreshAuthState();

  return timer(500).pipe( // Give it a short delay to allow the state to settle
    switchMap(() => authService.isAuthenticated$),
    take(1), // Take only the first emitted value
    map(isAuthenticated => {
      console.log('Guard check:', isAuthenticated);
      return isAuthenticated ? true : router.parseUrl('/v1/auth/login');
    })
  );
};
