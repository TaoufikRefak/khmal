import { Routes } from '@angular/router';
import { CourseListComponent } from './course-list/course-list.component';
import { CourseDetailComponent } from './course-detail/course-detail.component';
import { CourseCreateComponent } from './course-create/course-create.component';
import { CourseEditComponent } from './course-edit/course-edit.component';
import { authGuard } from '../auth/guards/auth.guard';
import { roleGuard } from '../auth/guards/role.guard';
import { CourseResolver } from './resolvers/course.resolver';

export const courseRoutes: Routes = [
  {
    path: '',
    component: CourseListComponent,
    title: 'Courses',
    canActivate: [authGuard]
  },
  {
    path: 'create',
    component: CourseCreateComponent,
    title: 'Create Course',
    canActivate: [roleGuard('teacher', 'admin')]
  },
  {
    path: ':id',
    component: CourseDetailComponent,
    title: 'Course Details',
    canActivate: [authGuard],
    resolve: { course: CourseResolver }
  },
  {
    path: ':id/edit',
    component: CourseEditComponent,
    title: 'Edit Course',
    canActivate: [roleGuard('teacher', 'admin')],
    resolve: { course: CourseResolver }
  }
];
