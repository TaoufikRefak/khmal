import { Routes } from '@angular/router';
import { roleGuard } from '../auth/guards/role.guard';
import { authGuard } from '../auth/guards/auth.guard';
import { ProfileComponent } from './profile/profile.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { UserEditComponent } from './user-edit/user-edit.component';
import { BranchUsersComponent } from './branch-users/branch-users.component';

export const userRoutes: Routes = [
  {
    path: 'profile',
    component: ProfileComponent,
    title: 'My Profile',
  },
  {
    path: 'management',
    children: [
      {
        path: '',
        component: AdminDashboardComponent,
        title: 'User Management',
        canActivate: [roleGuard('admin')],
      },
      {
        path: 'edit/:id',
        component: UserEditComponent,
        title: 'Edit User',
        canActivate: [roleGuard('admin')],
      },
      {
        path: 'branch/:id',
        component: BranchUsersComponent,
        title: 'Branch Users',
        canActivate: [roleGuard('teacher', 'admin')],
      },
    ],
  },
];
