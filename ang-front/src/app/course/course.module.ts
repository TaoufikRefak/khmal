import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { courseRoutes } from './course.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '../auth/interceptors/auth.interceptor';
import { CourseService } from './services/course.service';



@NgModule({
  declarations: [
    
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(courseRoutes)
  ],providers: [ CourseService,
      provideHttpClient(withInterceptors([authInterceptor]))
    ]
})
export class CourseModule { }
