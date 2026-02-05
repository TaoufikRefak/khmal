import { Routes } from '@angular/router';
import { authGuard } from '../auth/guards/auth.guard';
import { PlaylistListComponent } from './playlist-list/playlist-list.component';
import { PlaylistCreateComponent } from './playlist-create/playlist-create.component';
import { PlaylistDetailComponent } from './playlist-detail/playlist-detail.component';
import { CourseDetailComponent } from '../course/course-detail/course-detail.component';
import { EditPlaylistComponent } from './edit-playlist/edit-playlist.component';

export const playlistRoutes: Routes = [
  {
    path: '',
    component: PlaylistListComponent,
    canActivate: [authGuard],
  },
  {
    path: 'edit/:id',
    component: EditPlaylistComponent,
  },
  {
    path: 'create',
    component: PlaylistCreateComponent,
    canActivate: [authGuard],
  },
  {
    path: ':id',
    component: PlaylistDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: ':playlistId/course/:courseId',
    component: CourseDetailComponent,
  },
];
