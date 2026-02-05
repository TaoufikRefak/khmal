import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guard';
import { roleGuard } from './auth/guards/role.guard';
import { noAuthGuard } from './auth/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: 'user',
    children: [
      {
        path: '',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./user/user.module').then((m) => m.UserModule),
      },
      {
        path: 'management',
        canActivate: [authGuard, roleGuard('admin')],
        loadChildren: () =>
          import('./user/user.module').then((m) => m.UserModule),
      },
    ],
  },
  {
    path: 'v1/auth',
    canActivate: [noAuthGuard],

    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'course',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./course/course.module').then((m) => m.CourseModule),
  },
  {
    path: 'playlist',
    loadChildren: () =>
      import('./playlist/playlist.module').then((m) => m.PlaylistModule),
  },
  { path: '', redirectTo: 'v1/auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'v1/auth/login' },
];
