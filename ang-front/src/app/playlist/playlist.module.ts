import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { playlistRoutes } from './playlist.routes';
import { PlaylistService } from './services/playlist.service';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '../auth/interceptors/auth.interceptor';
// Since we are using standalone components, declarations are not mandatory.
// If you are not using standalone components, add your components here.

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(playlistRoutes)
  ],providers: [ PlaylistService,
        provideHttpClient(withInterceptors([authInterceptor]))
      ]
})
export class PlaylistModule { }
