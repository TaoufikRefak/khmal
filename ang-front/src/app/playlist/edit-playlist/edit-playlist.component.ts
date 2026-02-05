// edit-playlist.component.ts
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PlaylistService } from '../services/playlist.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // NgIf/NgFor are included in CommonModule
import { MatButtonModule } from '@angular/material/button'; // Keeping these if you still need them elsewhere, but they aren't used in the template/styles provided.
import { MatDialogModule } from '@angular/material/dialog'; // Keeping these if you still need them elsewhere.

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule, // Provides NgIf, NgFor, etc.
    // MatDialogModule, // Not used in this template's logic
    // MatButtonModule, // Not used in this template's logic
  ],
  template: `
    <!-- Use a wrapper div with themed container classes -->
    <div class="container page-container form-page-container">
      <!-- Add a title consistent with other pages -->
      <h2 class="dashboard-title">Edit Playlist</h2>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <!-- Form Group for Playlist Name -->
        <div class="form-group">
          <label for="playlistName" class="form-label">Playlist Name</label>
          <input
            type="text"
            id="playlistName"
            formControlName="name"
            class="form-control"
          />
          <!-- Add validation feedback if needed -->
          <!-- <div *ngIf="form.get('name')?.invalid && form.get('name')?.touched" class="form-error">
            Name is required.
          </div> -->
        </div>

        <!-- Form Check for Public Status -->
        <div class="form-check">
          <input
            type="checkbox"
            formControlName="is_public"
            id="isPublic"
            class="form-check-input"
          />
          <label for="isPublic" class="form-check-label">Public Playlist</label>
        </div>

        <!-- Courses List Section -->
        <div class="course-list-section">
          <h3 class="dashboard-subtitle">Courses in Playlist</h3>
          <div *ngIf="playlist?.courses?.length > 0; else noCourses">
            <div *ngFor="let course of playlist.courses" class="course-item">
              <span class="course-title">{{ course.title }}</span>
              <button
                type="button"
                (click)="removeCourse(course.id)"
                class="btn btn-danger btn-sm"
              >
                Remove
              </button>
            </div>
          </div>
          <ng-template #noCourses>
            <div class="empty-course-list">No courses added yet.</div>
          </ng-template>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save Changes</button>
          <!-- Using btn-outline-danger for remove all, consistent with red delete theme -->
          <button
            type="button"
            (click)="removeAllCourses()"
            class="btn btn-outline-danger"
          >
            Remove All Courses
          </button>
          <!-- Using btn-outline-secondary/btn-outline-primary for cancel -->
          <button
            type="button"
            (click)="router.navigate(['/playlist'])"
            class="btn btn-outline-primary"
          >
            Cancel
          </button>
        </div>
      </form>

      <!-- Add loading/error states if PlaylistService exposes them -->
      <div *ngIf="service.loading()" class="alert alert-info">
        <span class="spinner"></span> Loading playlist...
      </div>
      <div *ngIf="service.error()" class="alert alert-danger">
        <span class="icon-warning">!</span> {{ service.error() }}
      </div>
    </div>
  `,
  styles: [
    `
      /* Import the font */
      /* Your existing styles... */

      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      :host {
        font-family: 'Poppins', sans-serif;
        background-color: #f2e8cf; /* Very light beige */
        color: #386641; /* Dark green */
        min-height: 100vh;
        display: block;
        box-sizing: border-box;
        padding: 0 1rem; /* Add some horizontal padding on host */
      }

      /* --- Reusing Playlist List Container Styles --- */
      .page-container {
        max-width: 800px; /* Adjusted for form layout */
        margin: 2rem auto; /* Center the container */
        background-color: #ffffff; /* White background */
        padding: 2.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(56, 102, 65, 0.1); /* Subtle green shadow */
        display: flex;
        flex-direction: column;
        gap: 2rem; /* Space between sections (title, form, alerts) */
        box-sizing: border-box;
      }

      .dashboard-title {
        color: #386641; /* Dark Green */
        margin-top: 0;
        margin-bottom: 0.5rem; /* Space before form */
        font-size: 1.8rem;
        font-weight: 600;
        border-bottom: 2px solid rgba(56, 102, 65, 0.2);
        padding-bottom: 0.8rem;
        align-self: stretch;
      }

      /* --- Form Styling (Based on theme) --- */
      form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem; /* Space between form groups/sections */
      }

      .form-group {
        margin-bottom: 0; /* Gap handled by form flexbox */
        display: flex;
        flex-direction: column; /* Stack label and input */
      }

      .form-label {
        display: block;
        margin-bottom: 0.5rem;
        color: #386641; /* Dark Green */
        font-weight: 600;
        font-size: 1rem;
      }

      .form-control {
        width: 100%; /* Full width */
        padding: 0.75rem 1rem;
        border: 2px solid rgba(56, 102, 65, 0.3); /* Subtle green border */
        border-radius: 8px;
        font-size: 1rem;
        color: #386641; /* Dark Green text */
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        box-sizing: border-box; /* Include padding and border in element's total width and height */

        &:focus {
          outline: none;
          border-color: #6a994e; /* Medium Green on focus */
          box-shadow: 0 0 0 0.25rem rgba(106, 153, 78, 0.25); /* Light green glow */
        }
      }
      /* Style for disabled inputs if needed */
      .form-control:disabled {
        background-color: #e9ecef; /* Light grey background */
        opacity: 1;
        cursor: not-allowed;
      }

      /* Form Check (Checkbox) */
      .form-check {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1.5rem; /* Space below checkbox group */
      }

      .form-check-input {
        /* Minimal styling for input, browser defaults often best */
        /* You might need custom styles for consistent appearance across browsers */
        width: 1rem;
        height: 1rem;
        cursor: pointer;
      }

      .form-check-label {
        cursor: pointer;
        color: #386641; /* Dark Green */
        font-size: 1rem;
        user-select: none; /* Prevent text selection on label click */
      }

      /* --- Course List Section --- */
      .course-list-section {
        margin-top: 1.5rem; /* Space above the list */
        display: flex;
        flex-direction: column;
        gap: 0.8rem; /* Space between list items */
      }

      .dashboard-subtitle {
        color: #6a994e; /* Medium Green */
        margin-top: 0;
        margin-bottom: 0.5rem;
        font-size: 1.4rem; /* Slightly smaller than main title */
        font-weight: 600;
      }

      .course-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.8rem 1rem; /* Padding inside item */
        background-color: #ffffff; /* White background for items */
        border: 1px solid rgba(56, 102, 65, 0.1); /* Subtle border */
        border-radius: 6px; /* Rounded corners */
        gap: 1rem; /* Space between title and button */
        flex-wrap: wrap; /* Allow wrapping on small screens */

        .course-title {
          flex-grow: 1; /* Allow title to take space */
          margin-right: 1rem; /* Ensure space before button on same line */
          font-size: 1rem;
          color: #386641; /* Dark Green */
        }
      }

      .empty-course-list {
        text-align: center;
        padding: 1.5rem;
        font-style: italic;
        color: rgba(56, 102, 65, 0.6); /* Muted color */
        border: 1px dashed rgba(56, 102, 65, 0.3); /* Dashed border */
        border-radius: 8px;
        background-color: rgba(167, 201, 87, 0.05); /* Very subtle tint */
      }

      /* --- Form Actions --- */
      .form-actions {
        display: flex;
        gap: 1rem; /* Space between buttons */
        margin-top: 2rem;
        justify-content: flex-end; /* Align buttons to the right */
        flex-wrap: wrap; /* Allow buttons to wrap */
      }

      /* --- Reusing/Defining Button Styles --- */
      /* Base Button Style */
      .btn {
        padding: 0.75rem 1.5rem;
        border: 1px solid transparent;
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
        white-space: nowrap; /* Prevent button text wrapping */
      }

      /* Solid Primary (Green) Button Style */
      .btn-primary {
        background-color: #386641; /* Dark Green */
        color: #ffffff; /* White text */
        box-shadow: 0 4px 15px rgba(56, 102, 65, 0.3);

        &:hover:not(:disabled) {
          background-color: #2b4c31; /* Darker Green */
          box-shadow: 0 6px 20px rgba(56, 102, 65, 0.4);
          transform: translateY(-2px);
        }
        &:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(56, 102, 65, 0.4);
        }
      }

      /* === NEW/UPDATED === */
      /* Solid Danger (Red) Button Style for Individual Remove */
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
      /* === END NEW/UPDATED === */

      /* Outline Danger (Red) Button Style for Remove All */
      .btn-outline-danger {
        background-color: transparent;
        color: #bc4749; /* Red text */
        border-color: #bc4749; /* Red border */

        &:hover:not(:disabled) {
          background-color: #bc4749; /* Red background on hover */
          color: #ffffff; /* White text on hover */
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        &:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
      }

      /* Outline Primary (Green) Button Style for Cancel */
      .btn-outline-primary {
        background-color: transparent;
        color: #6a994e; /* Medium Green text */
        border-color: #6a994e; /* Medium Green border */

        &:hover:not(:disabled) {
          background-color: #6a994e; /* Medium Green background on hover */
          color: #ffffff; /* White text on hover */
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        &:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
      }

      /* Smaller button size (Applied to btn-danger btn-sm) */
      .btn-sm {
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
        border-radius: 6px;
      }

      /* Disabled button style */
      button:disabled {
        background: rgba(56, 102, 65, 0.3); /* Greyed out background */
        color: rgba(255, 255, 255, 0.6); /* Muted text color */
        cursor: not-allowed;
        opacity: 0.7;
        box-shadow: none;
        transform: none;
      }

      /* --- Reusing Alert Styles --- */
      .alert {
        padding: 1.5rem;
        margin: 0 auto;
        border: 1px solid transparent;
        border-radius: 8px;
        font-size: 1rem;
        text-align: center;
        display: block;
        max-width: 600px;
      }

      .alert .spinner,
      .alert .icon-warning {
        display: inline-block;
        vertical-align: middle;
        margin-right: 0.5rem;
      }

      .alert-info {
        color: #386641;
        background-color: rgba(167, 201, 87, 0.2);
        border-color: rgba(167, 201, 87, 0.5);
      }

      .alert-danger {
        color: #bc4749;
        background-color: rgba(188, 71, 73, 0.1);
        border-color: rgba(188, 71, 73, 0.3);
      }

      .spinner {
        border: 4px solid rgba(56, 102, 65, 0.3);
        border-top: 4px solid #386641;
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

      .icon-warning {
        font-size: 1.4rem;
        font-weight: bold;
      }

      /* --- Responsive Adjustments --- */
      @media (max-width: 768px) {
        .page-container {
          padding: 1.5rem;
          gap: 1.5rem;
          border-radius: 10px;
        }
        .dashboard-title {
          font-size: 1.6rem;
          margin-bottom: 1rem;
          padding-bottom: 0.8rem;
        }
        .form-group {
          gap: 0.4rem;
        }
        .form-label {
          font-size: 0.95rem;
          margin-bottom: 0.4rem;
        }
        .form-control {
          padding: 0.6rem 0.8rem;
          font-size: 0.95rem;
          border-radius: 6px;
        }
        .form-check {
          margin-bottom: 1rem;
        }
        .form-check-label {
          font-size: 0.95rem;
        }
        .course-list-section {
          margin-top: 1rem;
          gap: 0.6rem;
        }
        .dashboard-subtitle {
          font-size: 1.3rem;
          margin-bottom: 0.4rem;
          padding-bottom: 0.4rem;
        }
        .course-item {
          padding: 0.6rem 0.8rem;
          border-radius: 4px;
          gap: 0.8rem;
          .course-title {
            font-size: 0.95rem;
            margin-right: 0.8rem;
          }
        }
        .empty-course-list {
          padding: 1rem;
          font-size: 0.9rem;
          border-radius: 6px;
        }
        .form-actions {
          flex-direction: column; /* Stack buttons */
          gap: 0.8rem;
          margin-top: 1.5rem;
          justify-content: center; /* Center stacked buttons */
          align-items: stretch; /* Stretch buttons to full width */
        }
        .form-actions .btn {
          width: 100%; /* Full width for stacked buttons */
          text-align: center;
          padding: 0.8rem 1.5rem; /* Adjust padding */
          font-size: 1rem;
          border-radius: 6px;
        }
        .btn-sm {
          /* Override for small buttons within a stacked context if needed,
          but course-item buttons are still inline, so sm is fine there */
        }

        .alert {
          padding: 1rem;
          margin: 1.5rem auto;
          border-radius: 6px;
          font-size: 0.95rem;
          gap: 0.6rem; /* If alert content is flex */
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
export class EditPlaylistComponent {
  public service = inject(PlaylistService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  playlist: any; // Consider defining an interface for Playlist with 'courses' property

  // Use signals for loading/error from service for template reactivity

  form = new FormGroup({
    name: new FormControl<string>('', { nonNullable: true }),
    is_public: new FormControl<boolean>(false, { nonNullable: true }),
  });

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    // Subscribe and update component state
    this.service.getPlaylistById(id).subscribe({
      next: (playlist: any) => {
        // Use 'any' or define Playlist interface
        this.playlist = playlist;
        this.form.patchValue({
          name: playlist.name ?? '',
          is_public: playlist.is_public,
        });
      },
      error: (err: any) => {
        console.error('Failed to load playlist:', err);
        // Service's error signal should handle displaying the message
      },
    });
  }

  onSubmit() {
    const formValue = this.form.getRawValue();
    // Subscribe to updatePlaylist Observable
    this.service.updatePlaylist(this.playlist.id, formValue).subscribe({
      next: () => this.router.navigate(['/playlist']),
      error: (err: any) => {
        console.error('Failed to update playlist:', err);
        // Service's error signal should handle displaying the message
      },
    });
  }

  removeCourse(courseId: number) {
    // Subscribe to removeCourseFromPlaylist Observable
    this.service
      .removeCourseFromPlaylist(this.playlist.id, courseId)
      .subscribe({
        next: () => {
          // Manually update the local playlist object to reflect the removal
          this.playlist.courses = this.playlist.courses.filter(
            (c: any) => c.id !== courseId // Note: filter by course.id from API response, not the nested c.id
          );
        },
        error: (err: any) => {
          console.error('Failed to remove course:', err);
          // Service's error signal should handle displaying the message
        },
      });
  }

  removeAllCourses() {
    if (confirm('Remove all courses from this playlist?')) {
      // Subscribe to removeAllCourses Observable
      this.service.removeAllCourses(this.playlist.id).subscribe({
        next: () => {
          // Manually clear the courses array in the local playlist object
          this.playlist.courses = [];
        },
        error: (err: any) => {
          console.error('Failed to remove all courses:', err);
          // Service's error signal should handle displaying the message
        },
      });
    }
  }
}
