import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, CommonModule } from '@angular/common'; // Added CommonModule
import { PlaylistService } from '../services/playlist.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { AuthService } from '../../auth/services/auth.service';
import { Playlist } from '../playlist.model'; // Ensure this path is correct

@Component({
  selector: 'app-playlist-list',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, CommonModule], // Include CommonModule
  template: `
    <!-- Wrap the entire content in a container -->
    <div class="container page-container">
      <div class="controls playlist-controls">
        <a routerLink="/playlist/create" class="btn btn-primary">
          Create New Playlist
          <!-- icon omitted for brevity -->
        </a>
        <button
          (click)="refreshPublicPlaylists()"
          class="btn btn-outline-primary"
        >
          Refresh Public Playlists
        </button>
      </div>

      <div *ngIf="service.loading()" class="alert alert-info">
        <span class="spinner"></span> Loading playlists...
      </div>
      <div *ngIf="service.error()" class="alert alert-danger">
        <span class="icon-warning">!</span> {{ service.error() }}
      </div>

      <h2 class="dashboard-title">My Playlists</h2>
      <div class="playlist-grid">
        <div *ngFor="let playlist of service.playlists()" class="playlist-card">
          <div class="playlist-card-header">
            <h3 class="playlist-card-title">{{ playlist.name }}</h3>
            <div class="playlist-actions">
              <button
                (click)="deletePlaylist(playlist)"
                class="btn btn-danger btn-sm"
              >
                Delete
              </button>
              <a
                [routerLink]="['/playlist/edit', playlist.id]"
                class="btn btn-outline-secondary btn-sm"
              >
                Edit
              </a>
            </div>
          </div>

          <div *ngIf="playlist.course_count; else noCourses">
            <p>{{ playlist.course_count }} courses</p>
          </div>
          <ng-template #noCourses>
            <p class="playlist-course-count no-courses">
              No courses in this playlist
            </p>
          </ng-template>

          <div class="playlist-card-actions">
            <a
              [routerLink]="['/playlist', playlist.id]"
              class="btn btn-outline-primary btn-sm"
            >
              View Playlist
            </a>
          </div>
        </div>
      </div>

      <h2 class="dashboard-title">Public Playlists</h2>
      <div class="playlist-grid">
        <div
          *ngFor="let playlist of service.publicPlaylists()"
          class="playlist-card public"
        >
          <h3 class="playlist-card-title">{{ playlist.name }}</h3>
          <div *ngIf="playlist.course_count; else noCoursesPublic">
            <p>{{ playlist.course_count }} courses</p>
          </div>
          <ng-template #noCoursesPublic>
            <p class="playlist-course-count no-courses">
              No courses in this playlist
            </p>
          </ng-template>
          <div class="playlist-card-actions">
            <a
              [routerLink]="['/playlist', playlist.id]"
              class="btn btn-outline-primary btn-sm"
            >
              View Playlist
            </a>
          </div>
        </div>
      </div>
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
        display: block; /* Ensure it takes space */
        box-sizing: border-box;
      }
      .playlist-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .dashboard-title:not(:first-child) {
        margin-top: 3rem; /* Add space above the second title */
      }

      .playlist-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.5rem;
      }

      .container {
        /* Your template uses .container.page-container, using .page-container below */
        /* You can remove this block if not used, or merge with .page-container */
        padding: 2rem;
        max-width: 1600px; /* Wider container */
        margin: 0 auto;
        min-height: 100vh;
        box-sizing: border-box;
      }

      /* --- CONTAINER --- */
      /* Wrapper around the entire page content area */
      .page-container {
        /* Your template uses this class */
        max-width: 1200px; /* Wide container for grid layout */
        margin: 2rem auto; /* Center container with top/bottom margin */
        background-color: #ffffff; /* Keep white for crisp main content card */
        padding: 2.5rem;
        border-radius: 12px; /* Large border radius */
        box-shadow: 0 10px 30px rgba(56, 102, 65, 0.1); /* Subtle shadow using dark green */
        display: flex; /* Use flex for stacking sections (titles, grid, alerts) */
        flex-direction: column;
        gap: 2rem; /* Space between main sections */
        box-sizing: border-box;
      }

      /* --- TITLES --- */
      /* H2 headings for sections */
      .dashboard-title {
        /* Your template uses this class */
        color: #386641; /* Dark Green */
        margin-top: 0; /* Remove default margin */
        margin-bottom: 0.5rem; /* Keep some space before grid/list */
        font-size: 1.8rem; /* Slightly smaller title than forms/detail */
        font-weight: 600;
        border-bottom: 2px solid rgba(56, 102, 65, 0.2); /* Subtle green separator */
        padding-bottom: 0.8rem;
        align-self: stretch; /* Ensure border goes full width */
      }

      /* --- CONTROLS --- */
      /* Div containing Create/Refresh buttons */
      .controls {
        /* Your template uses .controls.playlist-controls, using .controls here */
        display: flex; /* Arrange items in a row */
        gap: 1rem; /* Space between buttons */
        align-items: center; /* Vertically align */
        flex-wrap: wrap; /* Allow wrapping on small screens */
        padding-bottom: 0.5rem; /* Add space below controls before title */
        align-self: stretch; /* Ensure it spans the container */
      }

      /* --- LOADING & ERROR ALERTS --- */
      /* Messages styled as alerts */
      .alert {
        /* Your template uses this class */
        padding: 1.5rem;
        margin: 0 auto; /* Center the alert block */
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

      /* --- PLAYLIST GRID --- */
      /* Container for playlist cards */
      .playlist-grid {
        /* Your template uses this class */
        display: grid;
        /* Responsive columns: auto-fill fits as many as possible, minmax sets size range */
        grid-template-columns: repeat(
          auto-fill,
          minmax(280px, 1fr)
        ); /* Slightly wider cards */
        gap: 1.5rem; /* Space between cards */
        align-self: stretch; /* Ensure grid takes full width */
      }

      /* --- PLAYLIST CARD --- */
      /* Individual card styling */
      .playlist-card {
        /* Your template uses this class */
        background: #ffffff; /* White background by default */
        padding: 1.5rem; /* Comfortable padding */
        border: 1px solid rgba(56, 102, 65, 0.2); /* Subtle green border */
        border-radius: 8px; /* Rounded corners */
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* Subtle card shadow */
        display: flex; /* Use flexbox for content within the card */
        flex-direction: column; /* Stack contents */
        gap: 0.8rem; /* Space between card elements */
        transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out; /* Smooth hover effect */
      }

      /* Distinct style for public playlist cards */
      .playlist-card.public {
        /* Your template uses this class */
        background: rgba(
          167,
          201,
          87,
          0.1
        ); /* Light Green/Yellow tint background for public */
        border-color: rgba(167, 201, 87, 0.5); /* More prominent border */
      }

      /* Card hover effect */
      .playlist-card:hover {
        transform: translateY(-5px); /* Lift effect */
        box-shadow: 0 8px 16px rgba(56, 102, 65, 0.1); /* Larger shadow */
      }

      /* Card Title */
      .playlist-card-title {
        /* Your template uses this class */
        margin-top: 0; /* Remove default margin */
        margin-bottom: 0; /* Gap is handled by card flexbox */
        font-size: 1.3rem;
        color: #386641; /* Dark Green for card title */
        font-weight: 600;
      }

      /* Course count text */
      .playlist-course-count p {
        /* Your template uses this class for the p tag */
        margin: 0; /* Remove default margin */
        color: rgba(56, 102, 65, 0.8); /* Muted dark green text color */
        font-size: 0.95rem;
      }

      /* No courses message */
      .playlist-course-count.no-courses {
        /* Your template uses this class */
        font-style: italic; /* Italicize */
        color: rgba(56, 102, 65, 0.6); /* More subtle color */
      }

      /* Card Actions / Link container */
      /* Added this div to structure the card bottom */
      .playlist-card-actions {
        /* Your template uses this class */
        margin-top: 1rem; /* Space above the action link */
        display: flex; /* Use flexbox if multiple actions were present */
        justify-content: flex-end; /* Align the action link to the right */
        align-items: center;
      }

      /* --- BUTTONS & LINKS --- */
      /* Define button styles reusing .btn class */

      /* Base button styles */
      .btn {
        /* Your template uses this class */
        padding: 0.75rem 1.5rem;
        border: 1px solid transparent; /* Default border */
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out,
          border-color 0.2s ease-in-out, transform 0.3s ease-in-out,
          box-shadow 0.3s ease-in-out;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
      }

      /* Primary button style (Create New Playlist) */
      .btn-primary {
        /* Your template uses this class */
        background-color: #386641; /* Dark Green */
        color: #ffffff; /* White text */
        box-shadow: 0 4px 15px rgba(56, 102, 65, 0.3); /* Matching shadow */

        &:hover:not(:disabled) {
          background-color: #2b4c31; /* Darker shade */
          box-shadow: 0 6px 20px rgba(56, 102, 65, 0.4);
          transform: translateY(-2px); /* Lift effect */
        }
        &:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(56, 102, 65, 0.4);
        }
      }

      /* Outline primary button style (Refresh, View Playlist) */
      .btn-outline-primary {
        /* Your template uses this class */
        background-color: transparent;
        color: #6a994e; /* Medium Green text */
        border-color: #6a994e; /* Medium Green border */

        &:hover:not(:disabled) {
          background-color: #6a994e;
          color: #ffffff; /* White text on hover */
          transform: translateY(-2px); /* Lift effect */
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        &:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
      }

      /* === ADD/UPDATE These Rules === */

      /* Solid Danger (Red) Button Style for Delete */
      .btn-danger {
        background-color: #bc4749; /* Red */
        color: #ffffff; /* White text */
        border-color: #bc4749; /* Red border (solid) */
        box-shadow: 0 4px 15px rgba(188, 71, 73, 0.3);

        &:hover:not(:disabled) {
          background-color: #9e3b3d; /* Darker Red */
          border-color: #9e3b3d; /* Darker Red border */
          box-shadow: 0 6px 20px rgba(188, 71, 73, 0.4);
          transform: translateY(-2px);
        }
        &:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(188, 71, 73, 0.4);
        }
      }

      /* Outline Secondary (Medium Green) Button Style for Edit */
      .btn-outline-secondary {
        background-color: transparent;
        color: #6a994e; /* Medium Green text */
        border-color: #6a994e; /* Medium Green border */

        &:hover:not(:disabled) {
          background-color: #6a994e; /* Medium Green background on hover */
          color: #ffffff; /* White text on hover */
          transform: translateY(-2px); /* Lift effect */
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        &:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
      }

      /* === END ADD/UPDATE === */

      /* Smaller button size */
      .btn-sm {
        /* Your template uses this class */
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
        border-radius: 6px;
      }

      /* Disabled button style */
      button:disabled {
        background: rgba(56, 102, 65, 0.3); /* Muted green tint */
        color: rgba(255, 255, 255, 0.6); /* Muted white text */
        cursor: not-allowed;
        opacity: 0.7;
        box-shadow: none;
        transform: none; /* No animation when disabled */
      }

      /* Link styled as button (Not explicitly used with .btn-link in your template, but included for completeness) */
      /*
        .btn-link {
          background: none;
          color: #386641;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          &:hover { text-decoration: underline; }
        }
        */

      /* --- Responsive Adjustments --- */
      @media (max-width: 768px) {
        .page-container {
          padding: 1.5rem;
          gap: 1.5rem; /* Slightly less space between sections */
          border-radius: 10px;
        }
        .dashboard-title {
          font-size: 1.6rem; /* Smaller title */
          margin-bottom: 1rem;
          padding-bottom: 0.8rem;
        }
        .controls {
          flex-direction: column; /* Stack controls */
          gap: 0.8rem;
        }
        .controls .btn {
          width: 100%; /* Full width for stacked buttons */
          text-align: center;
          padding: 0.8rem 1.5rem; /* Adjust padding */
          font-size: 1rem;
          border-radius: 6px;
        }
        .controls .btn-outline-primary svg {
          /* Adjust refresh icon size */
          width: 18px;
          height: 18px;
        }

        .playlist-grid {
          grid-template-columns: 1fr; /* Single column grid */
          gap: 1rem;
        }
        .playlist-card {
          padding: 1.2rem;
          border-radius: 6px;
          gap: 0.6rem;
        }
        .playlist-card-title {
          font-size: 1.2rem;
        }
        .playlist-course-count p {
          font-size: 0.9rem;
        }
        .playlist-card-actions {
          margin-top: 0.8rem;
          justify-content: flex-start; /* Align left on small screens */
        }
        .playlist-card-actions .btn-sm {
          width: auto; /* Don't force full width for sm button */
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          border-radius: 4px;
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
      }
    `,
  ],
})
export class PlaylistListComponent {
  service = inject(PlaylistService);
  authService = inject(AuthService);

  // Assuming PlaylistService has signals or public properties
  // named 'playlists', 'publicPlaylists', 'loading', and 'error'
  // based on their usage in your template.
  refreshPublicPlaylists() {
    this.service.loadPublicPlaylists().subscribe({
      error: (err: any) => console.error('Refresh failed:', err),
    });
  }
  deletePlaylist(playlist: Playlist) {
    if (!confirm('Are you sure?')) {
      return;
    }

    this.service.deletePlaylist(playlist.id).subscribe({
      next: () => {
        // if it was public, refresh public list; otherwise, reload user playlists
        if (playlist.is_public) {
          this.refreshPublicPlaylists();
        } else {
          this.service.loadUserPlaylists().subscribe();
        }
      },
      error: (err: any) => console.error('Delete failed:', err),
    });
  }

  ngOnInit() {
    this.service.loadUserPlaylists().subscribe(); // Manage subscription here
    this.service.loadPublicPlaylists().subscribe();
  }
}
