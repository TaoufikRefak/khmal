import { Course } from '../course/services/course.service';

export interface Playlist {
  id: number;
  name: string;
  student_id: number;
  branch_id?: number;
  is_public: boolean;
  course_count: number;
  courses: PlaylistCourse[];
  created_at?: string;
  updated_at?: string;
}

export interface PlaylistCourse {
  id: number;
  playlist_id: number;
  course_id: number;
  order?: number;
}

export interface RecommendationResponse {
  recommendations: number[];
}

export interface CreatePlaylistDto {
  name: string;
  is_public?: boolean;
}

export interface UpdatePlaylistDto extends Partial<CreatePlaylistDto> {}
