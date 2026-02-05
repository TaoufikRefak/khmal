import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIf, NgFor, CommonModule } from '@angular/common';
import { PlaylistService } from '../services/playlist.service';
import { CourseService } from '../../course/services/course.service';
import { AuthService } from '../../auth/services/auth.service';
import Hls from 'hls.js';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-playlist-detail',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, CommonModule],
  template: `
    <div class="container page-container">
      <div *ngIf="playlist; else loading">
        <h2 class="dashboard-title">{{ playlist.name }}</h2>
        <p class="detail-text-meta">
          {{ playlist.courses?.length || 0 }} courses in this playlist
        </p>

        <div class="grid-container">
          <div
            *ngFor="let entry of playlist.courses || []; trackBy: trackById"
            class="course-card"
            (mouseenter)="onCardHover(entry)"
            (mouseleave)="onCardLeave(entry)"
          >
            <div class="thumbnail-container">
              <img
                [src]="
                  coursesMap[entry.id]?.thumbnail ||
                  'assets/default-thumbnail.jpg'
                "
                alt="Course thumbnail"
                class="thumbnail"
              />
              <div
                class="hover-video"
                [class.visible]="hoveredCourseId === entry.id"
                [routerLink]="['/course', entry.id]"
                [queryParams]="{ playlistId: playlist.id }"
                *ngIf="!isMobile"
              >
                <video
                  #videoPlayer
                  muted
                  playsinline
                  (canplay)="handleVideoCanPlay(entry.id)"
                  [hidden]="!playingVideos[entry.id]"
                >
                  <source
                    [src]="coursesMap[entry.id]?.hls_url"
                    type="application/vnd.apple.mpegurl"
                  />
                </video>
                <div
                  class="loader"
                  *ngIf="
                    hoveredCourseId === entry.id && !playingVideos[entry.id]
                  "
                >
                  Loading...
                </div>
              </div>
            </div>

            <div class="course-info">
              <h3 class="title">
                {{ coursesMap[entry.id]?.title || 'Loading...' }}
              </h3>
              <div class="meta">
                <span class="teacher"
                  >Teacher {{ coursesMap[entry.id]?.teacher_id }}</span
                >
                <span class="views"
                  >{{ coursesMap[entry.id]?.views || 0 }} views</span
                >
                <span class="likes"
                  >{{ coursesMap[entry.id]?.like_count || 0 }} likes</span
                >
              </div>
            </div>
          </div>
        </div>

        <div class="actions">
          <a routerLink="/playlist" class="btn btn-link">Back to Playlists</a>
        </div>
      </div>

      <ng-template #loading>
        <p *ngIf="playlistService.loading()" class="alert alert-info">
          <span class="spinner"></span> Loading playlist details...
        </p>
        <p *ngIf="playlistService.error()" class="alert alert-danger">
          {{ playlistService.error() }}
        </p>
      </ng-template>
    </div>
  `,
  /* Inside your @Component decorator's styles: [...] */
  styles: [
    `
      /* Import a nice font - Poppins from Google Fonts */
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      :host {
        font-family: 'Poppins', sans-serif;
        /* Use the very light beige as the background */
        background-color: #f2e8cf;
        color: #386641; /* Use the dark green for main text */
        min-height: 100vh;
        display: flex; /* Use flexbox for centering */
        justify-content: center; /* Center horizontally */
        align-items: flex-start; /* Align to top */
        padding: 2rem;
        box-sizing: border-box;
      }

      /* --- CONTAINER --- */
      /* Wrapper around the main content */
      .page-container {
        /* Your template uses this class */
        max-width: 800px; /* Wider container than form, adjust as needed */
        width: 100%;
        background-color: #ffffff; /* Keep white for crisper main content card */
        padding: 2.5rem;
        border-radius: 12px; /* Large border radius */
        box-shadow: 0 10px 30px rgba(56, 102, 65, 0.1); /* Subtle shadow using dark green */
        margin: 0 auto;
      }

      /* --- TITLE --- */
      /* Heading style */
      .dashboard-title {
        /* Your template uses this class */
        color: #386641; /* Dark Green */
        margin-top: 0;
        margin-bottom: 1rem; /* Less margin below title as intro text follows */
        font-size: 2.4rem; /* Slightly larger title */
        font-weight: 600;
        border-bottom: 2px solid rgba(56, 102, 65, 0.2); /* Subtle green border */
        padding-bottom: 1.2rem;
        text-align: left;
      }

      /* --- META TEXT (Course Count) --- */
      /* Paragraph just below title */
      .detail-text-meta {
        font-size: 1.1rem;
        color: rgba(56, 102, 65, 0.8); /* Muted dark green */
        margin-top: -0.5rem; /* Pull up closer to title */
        margin-bottom: 1.5rem; /* Space before the list */
      }

      /* --- PLAYLIST COURSES LIST (Grid) --- */
      .grid-container {
        /* Your template uses this class */
        display: grid;
        grid-template-columns: repeat(
          auto-fill,
          minmax(280px, 1fr)
        ); /* Slightly smaller cards to fit more */
        gap: 2rem; /* Space between cards */
        padding: 1rem 0;
        margin-bottom: 2rem; /* Space before actions */
      }

      .course-card {
        /* Your template uses this class */
        background: #ffffff; /* Keep white for cards for cleanliness */
        border-radius: 8px; /* Rounded corners */
        box-shadow: 0 4px 10px rgba(56, 102, 65, 0.1); /* Subtle shadow */
        overflow: hidden;
        transition: transform 0.3s ease, box-shadow 0.3s ease; /* Smooth transitions */
        cursor: pointer;
        display: flex; /* Flexbox for layout inside card */
        flex-direction: column; /* Stack thumbnail and info */

        &:hover {
          transform: translateY(-5px); /* Noticeable lift */
          box-shadow: 0 8px 20px rgba(56, 102, 65, 0.15);
        }
      }

      .thumbnail-container {
        /* Your template uses this class */
        position: relative;
        padding-top: 56.25%; /* 16:9 aspect ratio */
        background: #030303; /* Dark background for video */
        flex-shrink: 0; /* Prevent container from shrinking */
        position: relative;
      }

      .thumbnail {
        /* Your template uses this class */
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.3s ease; /* Fade out thumbnail */
        opacity: 1;
        z-index: 1; /* Ensure thumbnail is above video when not hovered */
      }

      .hover-video {
        /* Your template uses this class */
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.3s ease; /* Fade in video */
        background-color: #030303; /* Dark background while loading */
        z-index: 2; /* Video should be above thumbnail */
        visibility: hidden; /* Initially hidden */
        text-decoration: none; /* Remove underline from RouterLink */

        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block; /* Remove extra space */
        }

        &.visible {
          opacity: 1;
          visibility: visible;
        }
      }

      .loader {
        /* Your template uses this class */
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ffffff; /* White text over dark background */
        font-weight: 500;
        z-index: 3; /* Above video */
      }

      .course-info {
        /* Your template uses this class */
        padding: 1.2rem; /* Standard padding */
        flex-grow: 1; /* Allow info to grow */
        display: flex;
        flex-direction: column;
      }

      .title {
        /* Your template uses this class */
        margin: 0 0 0.6rem; /* Space below title */
        font-size: 1.1rem; /* Standard title size */
        font-weight: 600;
        color: #386641; /* Dark Green */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.4;
      }

      .meta {
        /* Your template uses this class */
        display: flex;
        flex-wrap: wrap;
        gap: 0.8rem; /* Space between meta items */
        font-size: 0.9rem; /* Standard meta text size */
        color: rgba(56, 102, 65, 0.7); /* Muted dark green */
        margin-bottom: 0; /* No margin below meta if it's the last element */
        margin-top: auto; /* Push meta/actions to the bottom */
      }
      .meta span {
        /* Style for individual meta items */
        /* Optional: Add separator */
        /* &:not(:last-child)::after {
                 content: '•';
                 margin-left: 0.8rem;
                 color: rgba(56, 102, 65, 0.4);
             } */
      }

      /* --- ACTIONS CONTAINER (for Back Link) --- */
      /* Wrapper for the back link */
      .actions {
        /* Your template uses this class */
        margin-top: 1.5rem; /* Space above actions */
        display: flex; /* Use flex */
        justify-content: flex-start; /* Align link to the left */
        gap: 1rem; /* If other buttons/links are added later */
        align-items: center;
      }

      /* --- BUTTONS & LINKS (Back Link) --- */
      /* Reuse button/link base styles */
      .btn {
        /* Your template uses this class */
        /* Base button styles - should be global */
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out,
          transform 0.2s ease-in-out;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
      }

      /* Style for the Back link */
      .btn-link {
        /* Your template uses this class */
        background: none;
        color: rgba(56, 102, 65, 0.7); /* Muted dark green for link */
        padding: 0.75rem 1.5rem; /* Matching btn padding for consistent layout */
        border-radius: 8px; /* Rounded corner like buttons */
        /* Specific hover effect */
        &:hover {
          color: #386641; /* Dark Green on hover */
          background-color: rgba(56, 102, 65, 0.1); /* Subtle green tint */
          text-decoration: none;
          transform: translateY(-2px); /* Subtle lift on hover */
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        &:active {
          transform: translateY(0);
          box-shadow: none;
        }
      }

      /* --- LOADING & ERROR ALERTS --- */
      /* Apply .alert, .alert-info, .alert-danger to your message elements */
      .alert {
        /* Your template uses this class */
        padding: 1.5rem;
        margin: 1.5rem auto; /* Center the alert block */
        border: 1px solid transparent;
        border-radius: 8px; /* Medium border radius */
        font-size: 1rem;
        text-align: center; /* Center text */
        display: block; /* Revert to block layout */
        max-width: 600px; /* Limit alert width */
      }

      .alert .spinner,
      .alert .icon-warning {
        /* Your template uses these */
        display: inline-block; /* Keep icons/spinners inline */
        vertical-align: middle; /* Vertically align */
        margin-right: 0.5rem; /* Space between icon/spinner and text */
      }

      .alert-info {
        /* Your template uses this class */
        color: #386641; /* Dark Green */
        background-color: rgba(167, 201, 87, 0.2); /* Light Green/Yellow tint */
        border-color: rgba(167, 201, 87, 0.5); /* More prominent border */
      }

      .alert-danger {
        /* Your template uses this class */
        color: #bc4749; /* Red */
        background-color: rgba(188, 71, 73, 0.1); /* Light red tint */
        border-color: rgba(188, 71, 73, 0.3); /* More prominent border */
      }

      /* Spinner for Loading (Use within .alert-info) */
      .spinner {
        /* Your template uses this class */
        border: 4px solid rgba(56, 102, 65, 0.3); /* Light green border */
        border-top: 4px solid #386641; /* Dark Green spinner */
        border-radius: 50%;
        width: 24px;
        height: 24px;
        animation: spin 1s linear infinite;
        display: inline-block;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      /* Icon for Error (Use within .alert-danger) */
      .icon-warning {
        /* Add this class to an element inside alert-danger */
        font-size: 1.4rem;
        font-weight: bold;
      }

      /* --- Loading Spinner (Standalone) --- */
      /* If you have a standalone spinner for initial page load */
      .loading-spinner {
        /* Your template uses this class */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px; /* Give it some height */
        color: rgba(56, 102, 65, 0.8); /* Muted dark green */
        font-size: 1.1rem;
        font-weight: 500;
      }
      .loading-spinner .spinner {
        /* Spinner inside loading-spinner */
        width: 50px;
        height: 50px;
        border: 5px solid rgba(56, 102, 65, 0.2); /* Light green border */
        border-top: 5px solid #386641; /* Dark Green spinner */
        margin-bottom: 1rem;
      }

      /* --- Responsive Adjustments --- */
      @media (max-width: 768px) {
        /* Adjusted breakpoint */
        .page-container {
          padding: 1.5rem;
          border-radius: 10px;
        }
        .dashboard-title {
          font-size: 1.8rem;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
        }
        .detail-text-meta {
          font-size: 1rem;
          margin-bottom: 1.5rem;
        }
        .grid-container {
          grid-template-columns: 1fr; /* Stack cards */
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .course-card {
          border-radius: 8px;
        }
        .course-info {
          padding: 1rem;
        }
        .title {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        .meta {
          font-size: 0.9rem;
          gap: 0.6rem;
        }

        .actions {
          margin-top: 1rem;
        }
        .btn-link {
          padding: 0.6rem 1.2rem;
          font-size: 0.95rem;
          border-radius: 6px;
        }
        .alert {
          padding: 1rem;
          margin: 1.5rem auto;
          border-radius: 6px;
          font-size: 0.95rem;
          gap: 0.6rem;
        }
        .alert .spinner {
          width: 20px;
          height: 20px;
          border-width: 3px;
        }
        .alert .icon-warning {
          font-size: 1.2rem;
        }
        .loading-spinner {
          min-height: 250px;
          font-size: 1rem;
        }
        .loading-spinner .spinner {
          width: 40px;
          height: 40px;
          border-width: 4px;
          margin-bottom: 1rem;
        }
      }
    `,
  ],
})
export class PlaylistDetailComponent implements OnInit, OnDestroy {
  public playlist: any;
  public playlistService = inject(PlaylistService);
  private route = inject(ActivatedRoute);
  public courseService = inject(CourseService);
  private authService = inject(AuthService);

  hoveredCourseId: number | null = null;
  hoverTimeout: any;
  isMobile = false;
  coursesMap: { [key: number]: any } = {};

  @ViewChildren('videoPlayer') videoPlayers!: QueryList<
    ElementRef<HTMLVideoElement>
  >;
  playingVideos: { [key: number]: boolean } = {};
  private hlsInstances: { [key: number]: Hls } = {};

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.playlistService.getPlaylistById(id).subscribe({
      next: async (playlist: { courses: any }) => {
        this.playlist = playlist;
        await this.loadAllCourses(playlist.courses || []);
      },
      error: (err: { message: string | null }) => {
        this.playlistService._error.set(err.message);
      },
    });
    this.checkMobile();
  }

  private async loadAllCourses(courseEntries: any[]) {
    const requests = courseEntries.map((entry: any) =>
      this.courseService.getCourse(entry.id)
    );

    forkJoin(requests).subscribe((results: any[]) => {
      results.forEach((course: any, index: string | number) => {
        if (course) {
          this.coursesMap[courseEntries[Number(index)].id] = course;
        }
      });
    });
  }

  trackById(index: number, entry: any) {
    return entry.id;
  }

  onCardHover(course: any) {
    if (this.isMobile || !this.coursesMap[course.id]?.hls_url) return;

    this.hoveredCourseId = course.id;
    this.playingVideos[course.id] = false;
    clearTimeout(this.hoverTimeout);
    this.hoverTimeout = setTimeout(() => this.startHoverVideo(course), 500);
  }

  private startHoverVideo(course: any) {
    const videoRef = this.getVideoElement(course.id);
    const courseData = this.coursesMap[course.id];
    if (!videoRef || !courseData?.hls_url) return;

    const videoEl = videoRef.nativeElement;
    if (this.hlsInstances[course.id]) {
      this.hlsInstances[course.id].destroy();
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      this.hlsInstances[course.id] = hls;
      hls.loadSource(courseData.hls_url);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {});
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = courseData.hls_url;
      videoEl.play().catch(() => {});
    }
  }

  onCardLeave(course: any) {
    clearTimeout(this.hoverTimeout);
    const id = course.id;
    this.hoveredCourseId = null;
    const videoRef = this.getVideoElement(id);
    if (videoRef) {
      const videoEl = videoRef.nativeElement;
      videoEl.pause();
      videoEl.currentTime = 0;
      if (this.hlsInstances[id]) {
        this.hlsInstances[id].destroy();
        delete this.hlsInstances[id];
      }
    }
    delete this.playingVideos[id];
  }

  handleVideoCanPlay(courseId: number) {
    this.playingVideos[courseId] = true;
  }

  ngOnDestroy() {
    Object.values(this.hlsInstances).forEach((hls) => hls.destroy());
    this.videoPlayers.forEach((video) => {
      video.nativeElement.pause();
      video.nativeElement.src = '';
    });
  }

  private getVideoElement(courseId: number) {
    return this.videoPlayers.find(
      (_, index) => this.playlist.courses[index]?.id === courseId
    );
  }

  checkMobile() {
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
  }

  canEdit(): boolean {
    return this.authService.hasRole(['teacher', 'admin']);
  }
}
