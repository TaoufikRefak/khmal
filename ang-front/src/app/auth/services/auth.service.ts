import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, map, catchError } from 'rxjs';

interface User {
  id: number;
  email: string;
  role: string;
  branch_id?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private ngZone = inject(NgZone); // ✅ Ensures navigation works inside async events

  // ✅ BehaviorSubject to store authentication state
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  // ✅ Expose observables for async operations
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.initializeAuth();
  }

  initializeAuth(): void {
    const token = localStorage.getItem('jwt');
    if (token) {
      const user = this.safeDecodeToken(token);
      if (user) {
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } else {
        this.clearAuth();
      }
    }
  }

  /**
   * ✅ Ensure the guard always gets the latest authentication state
   */
  refreshAuthState(): void {
    this.initializeAuth(); // Force-check local storage before returning state
  }

  // ✅ Synchronous getters for direct access
  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
  // Add these methods to AuthService
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>('/auth/forgot-password', { email }).pipe(
      catchError((err: any) => {
        console.error('Password reset request failed:', err);
        throw err;
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http
      .post<void>('/auth/reset-password', {
        token,
        new_password: newPassword,
      })
      .pipe(
        catchError((err: any) => {
          console.error('Password reset failed:', err);
          throw err;
        })
      );
  }
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get currentBranchId(): number | undefined {
    return this.currentUser?.branch_id;
  }

  login(credentials: { email: string; password: string }): Observable<void> {
    return this.http.post<{ token: string }>('/auth/login', credentials).pipe(
      tap({
        next: ({ token }) => {
          localStorage.setItem('jwt', token);
          const user = this.safeDecodeToken(token);
          if (user) {
            this.currentUserSubject.next(user);
            this.isAuthenticatedSubject.next(true);

            console.log('Auth state updated. Redirecting...');

            // ✅ Ensure navigation happens inside NgZone
            this.ngZone.run(() => this.router.navigateByUrl('/course'));
          } else {
            this.clearAuth();
          }
        },
        error: (err: any) => console.error('Login failed:', err),
      }),
      map(() => undefined)
    );
  }

  register(userData: {
    email: string;
    password: string;
    role: string;
    branch_id?: number;
  }): Observable<void> {
    return this.http.post<void>('/auth/register', userData).pipe(
      catchError((err: any) => {
        console.error('Registration failed:', err);
        throw err;
      })
    );
  }

  logout(): void {
    this.clearAuth();
    this.ngZone.run(() => this.router.navigate(['/v1/auth/login']));
  }

  private clearAuth(): void {
    localStorage.removeItem('jwt');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  private safeDecodeToken(token: string): User | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.user_id,
        email: payload.email,
        role: payload.role,
        branch_id: payload.branch_id,
      };
    } catch {
      console.error('Invalid JWT token');
      return null;
    }
  }

  hasRole(role: string | string[]): boolean {
    const user = this.currentUser;
    if (!user) return false;
    return Array.isArray(role) ? role.includes(user.role) : user.role === role;
  }

  hasAnyRole(): boolean {
    return this.isAuthenticated;
  }
}
