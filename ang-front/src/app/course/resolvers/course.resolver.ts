import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CourseService, Course } from '../services/course.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CourseResolver implements Resolve<Course> {
  constructor(private courseService: CourseService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Course> {
    const id = Number(route.paramMap.get('id'));
    return this.courseService.getCourse(id).pipe(
      catchError(err => {
        // Handle error (you could redirect or show a message)
        return of(null as any);
      })
    );
  }
}
