import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { UserService } from './services/user.service';
import { ProfileComponent } from './profile/profile.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { UserEditComponent } from './user-edit/user-edit.component';
import { BranchUsersComponent } from './branch-users/branch-users.component';
import { userRoutes } from './user.routes';
import { authInterceptor } from '../auth/interceptors/auth.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(userRoutes)
  ],
  providers: [UserService, 
        provideHttpClient(withInterceptors([authInterceptor]))
      ]
})
export class UserModule {}