import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, switchMap, tap, throwError } from 'rxjs';
import { User, UserUpdateDto, UserFilters } from '../user.model';
import { AuthService } from '../../auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // State signals
  private _currentUser = signal<User | null>(null);
  private _users = signal<User[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Computed values
  currentUser = computed(() => this._currentUser());
  users = computed(() => this._users());
  loading = computed(() => this._loading());
  error = computed(() => this._error());

  // Observables
  currentUser$ = toObservable(this._currentUser);
  users$ = toObservable(this._users);

  constructor() {
    this.initializeCurrentUser();
  }

  private initializeCurrentUser() {
    if (this.authService.currentUser) {
      this.loadCurrentUser().subscribe();
    }
  }

  loadCurrentUser() {
    this._loading.set(true);
    return this.http.get<any>('/users/me').pipe(
      tap({
        next: (user) => {
          this._currentUser.set(user);
          this._loading.set(false);
        },
        error: (err) => {
          this._currentUser.set(null);
          this._loading.set(false);
          this._error.set('Failed to load current user');
        },
      }),
      catchError((err) => this.handleError(err, 'Failed to load current user'))
    );
  }

  loadUsers(filters?: UserFilters) {
    this._loading.set(true);
    this._error.set(null);

    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.append(key, value.toString());
        }
      });
    }

    return this.http.get<User[]>('/users', { params }).pipe(
      tap({
        next: (users) => {
          this._users.set(users);
          this._loading.set(false);
        },
        error: (err) => {
          this._loading.set(false);
          this._error.set('Failed to load users');
        },
      }),
      catchError((err) => this.handleError(err, 'Failed to load users'))
    );
  }

  getUser(id: number) {
    this._loading.set(true);
    return this.http.get<User>(`/users/${id}`).pipe(
      tap({
        next: () => this._loading.set(false),
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to load user'))
    );
  }

  updateUser(id: number, updates: UserUpdateDto) {
    this._loading.set(true);
    return this.http.put<User>(`/users/${id}`, updates).pipe(
      tap({
        next: (updatedUser) => {
          this._currentUser.update((current) =>
            current?.id === id ? updatedUser : current
          );
          this._users.update((users) =>
            users.map((u) => (u.id === id ? updatedUser : u))
          );
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to update user'))
    );
  }

  deleteUser(id: number) {
    this._loading.set(true);
    return this.http.delete<void>(`/users/${id}`).pipe(
      tap({
        next: () => {
          this._users.update((users) => users.filter((u) => u.id !== id));
          if (this.currentUser()?.id === id) {
            this.authService.logout();
          }
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to delete user'))
    );
  }

  loadBranchUsers(branchId: number) {
    this._loading.set(true);
    return this.http.get<User[]>(`/users/branches/${branchId}`).pipe(
      tap({
        next: (users) => {
          this._users.set(users);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to load branch users'))
    );
  }

  private handleError(error: any, message: string) {
    console.error(`${message}:`, error);
    this._error.set(message);
    return throwError(() => error);
  }
}
