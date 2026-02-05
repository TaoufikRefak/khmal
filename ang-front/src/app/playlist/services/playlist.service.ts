import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { catchError, finalize, tap } from 'rxjs/operators';
import { AuthService } from '../../auth/services/auth.service';
import {
  Playlist,
  PlaylistCourse,
  CreatePlaylistDto,
  UpdatePlaylistDto,
} from '../playlist.model';
import { Observable, throwError } from 'rxjs'; // Ensure throwError is imported

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // State signals
  public _playlists = signal<Playlist[]>([]);
  public _currentPlaylist = signal<Playlist | null>(null);
  public _publicPlaylists = signal<Playlist[]>([]);
  public _loading = signal(false);
  public _error = signal<string | null>(null);

  // Computed values
  playlists = computed(() => this._playlists());
  currentPlaylist = computed(() => this._currentPlaylist());
  publicPlaylists = computed(() => this._publicPlaylists());
  loading = computed(() => this._loading());
  error = computed(() => this._error());
  deletePlaylist(id: number): Observable<void> {
    this._loading.set(true);
    return this.http.delete<void>(`/playlists/${id}`).pipe(
      tap(() => {
        this._playlists.update((playlists) =>
          playlists.filter((p) => p.id !== id)
        );
        this._loading.set(false);
      }),
      catchError((err: any) => {
        this._loading.set(false);
        return this.handleError(err);
      })
    );
  }

  updatePlaylist(id: number, dto: UpdatePlaylistDto): Observable<Playlist> {
    this._loading.set(true);
    return this.http.put<Playlist>(`/playlists/${id}`, dto).pipe(
      tap((updated: any) => {
        this._playlists.update((playlists: Playlist[]) =>
          playlists.map((p) => (p.id === id ? updated : p))
        );
        this._loading.set(false);
      }),
      catchError((err: any) => this.handleError(err))
    );
  }

  removeAllCourses(playlistId: number) {
    this._loading.set(true);
    return this.http.delete(`/playlists/${playlistId}/courses`).pipe(
      tap(() => {
        this._playlists.update((playlists) =>
          playlists.map((p) =>
            p.id === playlistId ? { ...p, courses: [] } : p
          )
        );
        this._loading.set(false);
      }),
      catchError((err: any) => this.handleError(err))
    );
  }
  loadUserPlaylists() {
    this._loading.set(true);
    const userId = this.authService.currentUser?.id;
    return this.http
      .get<Playlist[]>(`/playlists`, {
        params: new HttpParams().set('user_id', userId?.toString() ?? ''),
      })
      .pipe(
        tap({
          next: (playlists: Playlist[]) => {
            this._playlists.set(playlists);
            this._loading.set(false);
          },
          error: (err: any) => {
            this._loading.set(false);
            this._error.set('Failed to load playlists');
          },
        }),
        catchError((error: any) => {
          this._loading.set(false);
          return throwError(() => error);
        })
      );
  }
  getPlaylistById(id: number) {
    this._loading.set(true);
    return this.http.get<Playlist>(`/playlists/${id}`).pipe(
      tap((playlist: any) => {
        this._loading.set(false);
      }),
      catchError((err: { message: string | null }) => {
        this._loading.set(false);
        this._error.set(err.message);
        return throwError(() => err);
      })
    );
  }

  loadPublicPlaylists() {
    this._loading.set(true);
    return this.http.get<Playlist[]>(`/playlists/public`).pipe(
      tap((playlists: Playlist[]) => {
        this._publicPlaylists.set(playlists);
        this._loading.set(false);
      }),
      catchError((err: any) => {
        this._loading.set(false);
        this._error.set('Failed to load public playlists');
        return throwError(() => err);
      }),
      finalize(() => this._loading.set(false)) // Add this
    );
  }

  createPlaylist(dto: CreatePlaylistDto) {
    this._loading.set(true);
    return this.http.post<Playlist>('/playlists', dto).pipe(
      tap((playlist: Playlist) => {
        this._playlists.update((playlists) => [...playlists, playlist]);
        this._loading.set(false);
      }),
      catchError(async (err: any) => this.handleError(err))
    );
  }

  addCourseToPlaylist(playlistId: number, courseId: number) {
    this._loading.set(true);
    return this.http
      .post<PlaylistCourse>(`/playlists/${playlistId}/courses`, {
        course_id: courseId,
      })
      .pipe(
        tap((newCourse: any) => {
          this._playlists.update((playlists) =>
            playlists.map((p) =>
              p.id === playlistId
                ? { ...p, courses: [...(p.courses || []), newCourse] }
                : p
            )
          );
          this._loading.set(false);
        }),
        catchError((err: { error: { error: any } }) => {
          this._loading.set(false);
          this._error.set(err.error?.error || 'Failed to add course');
          return throwError(() => err);
        })
      );
  }

  removeCourseFromPlaylist(playlistId: number, courseId: number) {
    this._loading.set(true);
    return this.http
      .delete(`/playlists/${playlistId}/courses/${courseId}`)
      .pipe(
        tap(() => {
          this._playlists.update((playlists) =>
            playlists.map((p) =>
              p.id === playlistId
                ? {
                    ...p,
                    courses:
                      p.courses?.filter((c) => c.course_id !== courseId) || [],
                  }
                : p
            )
          );
          this._loading.set(false);
        }),
        catchError(async (err: any) => this.handleError(err))
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('Error:', error);
    this._error.set(error.message || 'Unknown error');
    return throwError(() => error); // Return Observable
  }
}
