import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';

export interface Course {
  id: number;
  title: string;
  description: string;
  teacher_id: number;
  branch_id: number;
  hls_url: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  thumbnail: string;
  views: number;
}

export interface CourseCreateDto {
  title: string;
  description: string;
  teacher_id?: number;
  branch_id?: number;
  video: File;
}

export interface CourseUpdateDto {
  title?: string;
  description?: string;
  video?: File;
}

export interface Comment {
  id: number;
  text: string;
  user_id: number;
  user_email: string;
  created_at: string;
  user_role: string;
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // State signals
  private _courses = signal<Course[]>([]);
  private _currentCourse = signal<Course | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _currentPage = signal(1);
  private _totalPages = signal(0);
  private _totalItems = signal(0);
  currentPage = computed(() => this._currentPage());
  totalPages = computed(() => this._totalPages());
  totalItems = computed(() => this._totalItems());

  // Computed values
  courses = computed(() => this._courses());
  currentCourse = computed(() => this._currentCourse());
  loading = computed(() => this._loading());
  error = computed(() => this._error());
  private _recommendations = signal<Course[]>([]);
  private _recsLoading = signal(false);
  recommendations = computed(() => this._recommendations());
  recsLoading = computed(() => this._recsLoading());
  // Load courses with optional filters
  loadCourses(
    page: number = 1,
    perPage: number = 9,
    filters?: {
      branch_id?: number;
      teacher_id?: number;
      search?: string; // Add this
    }
  ) {
    this._loading.set(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          // Allow empty string for search
          params = params.append(key, value.toString());
        }
      });
    }

    return this.http
      .get<{
        courses: Course[];
        total: number;
        page: number;
        pages: number;
        per_page: number;
      }>('/courses', { params })
      .pipe(
        tap({
          next: (response) => {
            this._courses.set(response.courses);
            this._currentPage.set(response.page);
            this._totalPages.set(response.pages);
            this._totalItems.set(response.total);
            this._loading.set(false);
          },
          error: (err) => {
            this._loading.set(false);
            this._error.set('Failed to load courses');
          },
        }),
        catchError((err) => this.handleError(err, 'Failed to load courses'))
      );
  }

  getRandomCourses(): Observable<number[]> {
    return this.http.get<number[]>(`/analytics/random`).pipe(
      catchError(() => of(this.generateFallbackIds())) // Fallback to local IDs
    );
  }
  private generateFallbackIds(): number[] {
    // Local fallback if API fails
    return [1, 2, 3, 4, 5]; // Replace with actual course IDs from your system
  }
  getCourseTitle$(id: number): Observable<string> {
    return this.http.get<Course>(`/courses/${id}`).pipe(
      map((course) => course.title),
      catchError(() => of('Error loading title'))
    );
  }
  private _titles = signal<Record<number, string>>({});
  titles = computed(() => this._titles());

  loadCourseTitle(id: number) {
    // Only fetch if we don’t already have it
    if (!this._titles()[id]) {
      this.http
        .get<Course>(`/courses/${id}`)
        .pipe(map((c) => c.title))
        .subscribe((title) => {
          // SAFE: this subscription callback is not in a computed
          this._titles.set({ ...this._titles(), [id]: title });
        });
    }
  }
  loadRecommendations(studentId: number) {
    this._recsLoading.set(true);

    //  /analytics/recommendations -> [ids]
    //  fallback to /analytics/top-rated -> [ids]
    //  fallback to /analytics/random -> [ids]
    this.http
      .get<{ recommendations: number[] }>(
        `/analytics/recommendations/${studentId}`
      )
      .pipe(
        map((res) => res.recommendations),
        switchMap((ids) =>
          ids && ids.length
            ? of(ids)
            : this.http.get<number[]>(`/analytics/top-rated`)
        ),
        switchMap((ids) =>
          ids && ids.length
            ? of(ids)
            : this.http.get<number[]>(`/analytics/random`)
        ),
        switchMap((ids: number[]) =>
          forkJoin(
            ids.map((id) => this.getCourse(id).pipe(catchError(() => of(null))))
          )
        ),
        map(
          (courses: (Course | null)[]) =>
            courses.filter((c) => c !== null) as Course[]
        ),
        tap({
          next: (courses) => {
            this._recommendations.set(courses);
            this._recsLoading.set(false);
          },
          error: () => {
            this._recommendations.set([]);
            this._recsLoading.set(false);
          },
        }),
        catchError((err) => {
          console.error('Failed loading recs:', err);
          this._recommendations.set([]);
          this._recsLoading.set(false);
          return of([]);
        })
      )
      .subscribe();
  }

  // 3) Optional: expose a method to clear recs cache
  clearRecommendations() {
    this._recommendations.set([]);
  }

  // 4) In your existing loadCourse, after tracking view, trigger recalc:
  trackViewAndCheckLikes(courseId: number): void {
    // … existing
    this.trackCourseView(courseId)
      .pipe(
        tap(() => {
          const userId = this.authService.currentUser?.id;
          if (userId) {
            this.loadRecommendations(userId);
          }
        })
      )
      .subscribe();
  }

  // 5) Update getRecommendations to delegate to loadRecommendations
  getRecommendations(studentId: number) {
    this.loadRecommendations(studentId);
    return toObservable(this.recommendations);
  }

  getTitle(id: number): string {
    // Trigger load if needed
    this.loadCourseTitle(id);
    // Return existing or a placeholder
    return this.titles()[id] ?? 'Loading...';
  }
  // Get single course by ID
  // In CourseService
  private _courseCache = signal<Record<number, Course>>({});

  getCourse(id: number) {
    const cached = this._courseCache()[id];
    if (cached) {
      return of(cached); // Return cached version
    }

    return this.http.get<Course>(`/courses/${id}`).pipe(
      map((course) => ({
        ...course,
        views: course.views || 0,
        like_count: course.like_count || 0,
        thumbnail: course.thumbnail || 'assets/default-thumbnail.jpg',
      })),
      tap((course) => {
        this._courseCache.set({ ...this._courseCache(), [id]: course });
      })
    );
  }
  checkLikeStatus(
    courseId: number
  ): Observable<{ is_liked: boolean; like_count: number }> {
    return this.http.get<{ is_liked: boolean; like_count: number }>(
      `/courses/${courseId}/likes/status`
    );
  }
  // Create new course with video upload
  createCourse(courseData: CourseCreateDto) {
    this._loading.set(true);
    const formData = new FormData();

    formData.append('title', courseData.title);
    formData.append('description', courseData.description);
    formData.append('video', courseData.video);

    // Add admin-only fields if present
    if (courseData.branch_id) {
      formData.append('branch_id', courseData.branch_id.toString());
    }
    if (courseData.teacher_id) {
      formData.append('teacher_id', courseData.teacher_id.toString());
    }

    return this.http.post<Course>('/courses', formData).pipe(
      tap({
        next: (course) => {
          this._courses.update((courses) => [...courses, course]);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to create course'))
    );
  }

  // Update existing course
  updateCourse(id: number, updates: CourseUpdateDto) {
    this._loading.set(true);
    const formData = this.createFormData(updates);

    return this.http.put<Course>(`/courses/${id}`, formData).pipe(
      tap({
        next: (updated) => {
          this._courses.update((courses) =>
            courses.map((c) => (c.id === id ? updated : c))
          );
          this._currentCourse.set(updated);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to update course'))
    );
  }

  // Delete course
  deleteCourse(id: number) {
    this._loading.set(true);
    return this.http.delete(`/courses/${id}`).pipe(
      tap({
        next: () => {
          this._courses.update((courses) => courses.filter((c) => c.id !== id));
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to delete course'))
    );
  }

  // Get courses by teacher
  getTeacherCourses(teacherId: number) {
    this._loading.set(true);
    return this.http.get<Course[]>(`/teachers/${teacherId}/courses`).pipe(
      tap({
        next: (courses) => {
          this._courses.set(courses);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
      catchError((err) =>
        this.handleError(err, 'Failed to load teacher courses')
      )
    );
  }

  // Get courses by branch
  getBranchCourses(branchId: number) {
    this._loading.set(true);
    return this.http.get<Course[]>(`/branches/${branchId}/courses`).pipe(
      tap({
        next: (courses) => {
          this._courses.set(courses);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
      catchError((err) =>
        this.handleError(err, 'Failed to load branch courses')
      )
    );
  }

  // Track course view
  trackCourseView(courseId: number) {
    // If the current user is an admin or teacher, skip tracking and return a harmless observable.
    if (
      this.authService.currentUser?.role === 'admin' ||
      this.authService.currentUser?.role === 'teacher'
    ) {
      return of(null);
    }

    return this.http.post(`/courses/${courseId}/view`, null).pipe(
      catchError((err) => {
        console.error('Failed to track view', err);
        return of(null);
      })
    );
  }

  // -------------------------
  // New Methods: Comments Endpoints
  // -------------------------
  getComments(courseId: number) {
    this._loading.set(true);
    return this.http.get<Comment[]>(`/courses/${courseId}/comments`).pipe(
      tap({
        next: () => this._loading.set(false),
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to load comments'))
    );
  }

  addComment(courseId: number, text: string) {
    return this.http.post<Comment>(
      `/courses/${courseId}/comments`,
      { text },
      { headers: { 'Cache-Control': 'no-cache' } } // Prevent caching
    );
  }

  deleteComment(commentId: number) {
    this._loading.set(true);
    return this.http.delete(`/courses/comments/${commentId}`).pipe(
      tap({
        next: () => this._loading.set(false),
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to delete comment'))
    );
  }

  // -------------------------
  // New Methods: Like Endpoints
  // -------------------------
  likeCourse(courseId: number) {
    this._loading.set(true);
    return this.http.post(`/courses/${courseId}/like`, null).pipe(
      tap({
        next: (res: any) => {
          // Optionally, update the local course like_count if needed.
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to like course'))
    );
  }

  unlikeCourse(courseId: number) {
    this._loading.set(true);
    return this.http.delete(`/courses/${courseId}/like`).pipe(
      tap({
        next: (res: any) => {
          // Optionally, update the local course like_count if needed.
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      }),
      catchError((err) => this.handleError(err, 'Failed to unlike course'))
    );
  }

  // -------------------------
  // Helper Methods
  // -------------------------
  private createFormData(data: any): FormData {
    const formData = new FormData();
    const user = this.authService.currentUser;

    // Add base fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'video') {
          formData.append('video', value as File);
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    // Add role-based fields
    if (user?.role === 'teacher') {
      formData.append('teacher_id', user.id.toString());
      formData.append('branch_id', user.branch_id?.toString() ?? '');
    }

    return formData;
  }

  private handleError(error: any, message: string) {
    console.error(`${message}:`, error);
    this._error.set(message);
    return throwError(() => error);
  }
}
