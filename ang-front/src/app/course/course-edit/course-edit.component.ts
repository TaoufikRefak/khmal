import { Component, inject, OnInit } from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CourseService } from '../services/course.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIf, CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIf, CommonModule],
  template: `
    <div class="container">
      <div class="form-card">
        <div *ngIf="course; else loading">
          <h2>
            Edit Course: <br />
            <b>{{ course.title | uppercase }} </b>
          </h2>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="title">Title</label>
              <input
                id="title"
                type="text"
                formControlName="title"
                [class.invalid]="
                  form.controls['title'].invalid &&
                  form.controls['title'].touched
                "
                placeholder="Enter course title"
              />
              @if (form.controls['title'].invalid &&
              form.controls['title'].touched) {
              <p class="error">Title is required</p>
              }
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <textarea
                id="description"
                formControlName="description"
                [class.invalid]="
                  form.controls['description'].invalid &&
                  form.controls['description'].touched
                "
                placeholder="Describe the course content"
              ></textarea>
              @if (form.controls['description'].invalid &&
              form.controls['description'].touched) {
              <p class="error">Description is required</p>
              }
            </div>

            <div class="form-group">
              <label>Video Update (optional)</label>
              <div class="file-input-container">
                <input
                  type="file"
                  (change)="onFileChange($event)"
                  accept="video/*"
                  #fileInput
                  hidden
                />
                <button
                  type="button"
                  class="button-secondary"
                  (click)="fileInput.click()"
                >
                  Choose New Video
                </button>
                <span class="file-name">{{
                  selectedFile?.name || 'No file chosen'
                }}</span>
              </div>
              @if (videoError) {
              <p class="error">{{ videoError }}</p>
              }
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="button-primary"
                [disabled]="form.invalid"
              >
                Update Course
              </button>
              <a routerLink="/courses" class="link-subtle">Cancel</a>
            </div>
          </form>
        </div>

        <ng-template #loading>
          <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading course details...</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  /* Inside your @Component decorator's styles: [...] */
  styles: [
    `
      /* Import a nice font - Poppins from Google Fonts */
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      :host {
        /* Apply font and basic background to the component's host element */
        font-family: 'Poppins', sans-serif;
        display: flex; /* Use flexbox for centering */
        justify-content: center; /* Center horizontally */
        align-items: center; /* Center vertically */
        min-height: 100vh; /* Take at least full viewport height */
        /* Use the very light beige as the background */
        background-color: #f2e8cf;
        color: #386641; /* Use the dark green for main text */
        padding: 2rem; /* Add some padding around content */
        box-sizing: border-box; /* Include padding in element's total width and height */
      }

      /* Container for the overall form */
      .container {
        width: 100%; /* Take full width up to max-width */
        max-width: 650px; /* Adjusted max-width for a slightly wider form */
        box-sizing: border-box;
        padding: 0 1rem; /* Add horizontal padding on potentially smaller screens */
      }

      /* The card containing the form */
      .form-card {
        background: #ffffff; /* Keep pure white for the form card for cleanliness */
        border-radius: 12px; /* More rounded, friendly corners */
        box-shadow: 0 10px 30px rgba(56, 102, 65, 0.1); /* Subtle shadow using the dark green */
        padding: 3rem; /* Increased padding */
        width: 100%; /* Take full width of container */
        box-sizing: border-box;
        text-align: center; /* Center the title and potentially cancel link */
        transition: transform 0.3s ease, box-shadow 0.3s ease; /* Smooth transitions */
      }
      .form-card:hover {
        transform: translateY(-5px); /* More noticeable lift on hover */
        box-shadow: 0 15px 40px rgba(56, 102, 65, 0.15);
      }

      /* Form Title */
      h2 {
        color: #386641; /* Dark Green */
        font-size: 2.4rem; /* Slightly larger title */
        margin-bottom: 2.5rem; /* More space below title */
        text-align: center;
        font-weight: 700; /* Bolder title */
        letter-spacing: -0.8px; /* Tighter letter spacing */
        line-height: 1.2;
      }
      h2 b {
        /* Style for the uppercase title part */
        display: block; /* Put it on its own line if it gets long */
        font-size: 1.5rem; /* Slightly smaller than main title */
        font-weight: 600;
        color: rgba(56, 102, 65, 0.8); /* Muted dark green */
        margin-top: 0.5rem;
      }

      /* Standard Form Group spacing */
      .form-group {
        margin-bottom: 2rem; /* Generous spacing between form groups */
        text-align: left; /* Align labels and inputs to the left */
      }

      /* Labels */
      label {
        display: block; /* Make label take its own line */
        font-weight: 600; /* Bolder label text */
        color: #386641; /* Use Dark Green for labels */
        margin-bottom: 0.8rem; /* Space below label */
        font-size: 1rem; /* Standard label font size */
      }

      /* Style for all text-based inputs, textarea, and select */
      input[type='text'],
      input[type='number'],
      textarea,
      select {
        width: 100%;
        padding: 1rem 1.2rem; /* Generous padding inside inputs */
        border: 1px solid rgba(56, 102, 65, 0.3); /* Subtle green border */
        border-radius: 8px; /* Rounded corners */
        font-size: 1rem;
        line-height: 1.5;
        box-sizing: border-box; /* Ensures padding/border are included in width */
        background: #ffffff; /* Pure white background for inputs */
        color: #386641; /* Dark green text color */
        transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out; /* Smooth transitions */
      }

      /* Textarea specific height */
      textarea {
        min-height: 180px; /* Make textarea larger */
        resize: vertical; /* Allow vertical resizing */
      }

      /* Placeholder text style */
      input::placeholder,
      textarea::placeholder {
        color: rgba(56, 102, 65, 0.5); /* Muted dark green */
        opacity: 1; /* Ensure placeholder is fully visible */
      }

      /* Add select styling */
      select {
        /* Inherits most styles from the block above */
        appearance: none; /* Remove default select arrow */
        /* Custom arrow */
        background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23386641%22%20d%3D%22M287%2C114.7L159.1%2C21.3c-5.3-4.2-12.9-4.2-18.2%2C0L5.4%2C114.7c-5.4%2C4.3-5.6%2C12.5-0.4%2C17.1l15.5%2C15.9c5%2C5.1%2C13.3%2C5.4%2C18.7%2C0.8l109-89.1l108.3%2C89.1c5.4%2C4.6%2C13.7%2C4.3%2C18.7-0.8l15.5-15.9C292.5%2C127.1%2C292.4%2C119%2C287%2C114.7z%22%2F%3E%3C%2Fsvg%3E'); /* Dark Green arrow */
        background-repeat: no-repeat;
        background-position: right 12px center; /* Center vertically */
        background-size: 10px auto; /* Smaller arrow */
        padding-right: 30px; /* Make space for the custom arrow */
      }

      /* Focus state - colorful border and subtle shadow */
      input:focus,
      textarea:focus,
      select:focus {
        outline: none; /* Remove default browser outline */
        border-color: #386641; /* Dark Green */
        box-shadow: 0 0 0 4px rgba(56, 102, 65, 0.2); /* Matching subtle glow using the green */
      }

      /* Invalid state - clear but not aggressive */
      input.invalid,
      textarea.invalid,
      select.invalid {
        border-color: #bc4749; /* Red */
        background: rgba(188, 71, 73, 0.1); /* Light red tint background */
        box-shadow: 0 0 0 4px rgba(188, 71, 73, 0.1); /* Matching subtle glow */
      }

      /* Error message styling */
      .error {
        color: #bc4749; /* Red */
        font-size: 0.95rem; /* Slightly larger error text */
        margin-top: 0.8rem; /* More space above error */
        display: flex; /* Align icon and text */
        align-items: center;
        gap: 0.5rem; /* Space between icon and text */
        font-weight: 500; /* Medium weight */
      }

      .error::before {
        content: '⚠️'; /* Warning sign emoji */
        font-size: 1em; /* Match text size */
        color: #bc4749; /* Ensure icon color matches text */
      }

      /* Button base style (re-used by primary and secondary) */
      button {
        padding: 1rem 2rem; /* Standard button padding */
        border: none;
        border-radius: 8px; /* Matches input border-radius */
        font-size: 1.1rem; /* Larger font size */
        font-weight: 600; /* Bolder text */
        cursor: pointer;
        transition: all 0.2s ease; /* Smooth transitions */
        text-align: center; /* Center text within button */
      }

      /* Primary button - uses Dark Green */
      .button-primary {
        background-color: #386641; /* Dark Green */
        color: white; /* White text for contrast */
        box-shadow: 0 4px 15px rgba(56, 102, 65, 0.3); /* Matching vibrant shadow */
      }
      .button-primary:hover {
        background-color: #2b4c31; /* Darker shade on hover */
        box-shadow: 0 6px 20px rgba(56, 102, 65, 0.4);
        transform: translateY(-2px); /* More noticeable lift */
      }
      .button-primary:active {
        box-shadow: 0 2px 8px rgba(56, 102, 65, 0.4);
        transform: translateY(0); /* Return to original position */
      }

      /* Secondary button - styled for file input trigger */
      .button-secondary {
        background-color: #6a994e; /* Medium Green */
        color: white; /* White text for contrast */
        border: 1px solid rgba(56, 102, 65, 0.1); /* Subtle green border */
        padding: 0.8rem 1.5rem; /* Slightly smaller padding than primary */
        font-size: 1rem; /* Standard font size */
        border-radius: 6px; /* Slightly less rounded */
        flex-shrink: 0; /* Prevent shrinking in flex container */
      }
      .button-secondary:hover {
        background-color: #588244; /* Slightly darker medium green */
        border-color: rgba(56, 102, 65, 0.2);
      }
      .button-secondary:active {
        background-color: #6a994e;
        border-color: rgba(56, 102, 65, 0.2);
      }

      /* Container for the file input and name */
      .file-input-container {
        display: flex;
        align-items: center;
        gap: 1.2rem; /* Space between button and filename */
        border: 1px dashed rgba(56, 102, 65, 0.3); /* Subtle green dashed border */
        border-radius: 8px; /* Matches input border-radius */
        padding: 1rem 1.5rem; /* Padding inside container */
        background-color: rgba(
          167,
          201,
          87,
          0.1
        ); /* Very light green/yellow tint background */
      }

      .file-name {
        color: rgba(
          56,
          102,
          65,
          0.8
        ); /* Slightly lighter dark green text color */
        font-size: 1rem; /* Readable font size */
        flex-grow: 1; /* Allow name to take available space */
        overflow: hidden; /* Hide overflow */
        text-overflow: ellipsis; /* Show ellipsis for long names */
        white-space: nowrap; /* Prevent wrapping */
      }

      /* Admin Section - Not present in this component's HTML, but keeping pattern for consistency */
      /* .admin-section { ... } */
      /* .admin-section h3 { ... } */
      /* .admin-section .form-group { ... } */

      /* Link - Subtle secondary action (Cancel) */
      .link-subtle {
        display: block; /* Make link take its own line */
        text-align: center;
        color: rgba(56, 102, 65, 0.7); /* Muted dark green */
        margin-top: 2.5rem; /* Space above the link */
        text-decoration: none;
        font-size: 1rem; /* Standard font size */
        transition: color 0.2s ease;
      }
      .link-subtle:hover {
        color: #386641; /* Dark Green on hover */
        text-decoration: underline; /* Underline on hover */
      }

      /* Disabled State for ALL buttons (general rule) */
      button:disabled {
        background: rgba(56, 102, 65, 0.3); /* Muted green tint */
        color: rgba(255, 255, 255, 0.6); /* Muted white text */
        cursor: not-allowed;
        opacity: 0.7; /* Slightly transparent */
        box-shadow: none; /* Remove shadow */
        transform: none; /* Remove lift */
      }

      /* Form Level Error Styling (for creationFailed - adapt for update failed) */
      /* Assuming you add a form-error paragraph for update failed */
      .form-error {
        color: #bc4749; /* Red */
        background: rgba(188, 71, 73, 0.1); /* Light red tint background */
        padding: 1.5rem; /* Generous padding */
        border-radius: 8px; /* Matches inputs */
        margin-bottom: 2rem; /* More space below the error message */
        text-align: center;
        font-weight: 600;
        border: 1px solid rgba(188, 71, 73, 0.3); /* Matching border */
        box-shadow: 0 1px 6px rgba(188, 71, 73, 0.1); /* Subtle shadow */
      }

      /* Form Actions Container */
      .form-actions {
        display: flex;
        justify-content: space-between; /* Space between button and link */
        align-items: center;
        margin-top: 3rem; /* More space above */
        padding-top: 2.5rem; /* More space above border */
        border-top: 1px solid rgba(56, 102, 65, 0.2); /* Subtle green border */
      }
      .form-actions .button-primary {
        /* Adjust primary button in actions container */
        margin-top: 0; /* Remove top margin */
        width: auto; /* Don't force full width */
        max-width: none; /* Remove max width */
        display: inline-flex; /* Use inline-flex */
      }
      .form-actions .link-subtle {
        /* Adjust link in actions container */
        margin-top: 0; /* Remove top margin */
        font-size: 1.1rem; /* Match button size */
        font-weight: 600; /* Match button weight */
        padding: 1rem 0; /* Add vertical padding for clickable area */
      }

      /* --- Loading Spinner --- */
      .loading-spinner {
        /* Original class name from your template */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center; /* Center vertically in its space */
        min-height: 400px; /* Ensure it has some height */
        color: rgba(56, 102, 65, 0.8); /* Muted dark green */
        text-align: center;
        font-size: 1.2rem;
        font-weight: 500;
      }

      .spinner {
        width: 60px; /* Larger spinner */
        height: 60px; /* Larger spinner */
        border: 6px solid rgba(56, 102, 65, 0.3); /* Light green border */
        border-top: 6px solid #386641; /* Dark Green spinner */
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1.5rem; /* More space below spinner */
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      /* --- Responsive adjustments --- */
      @media (max-width: 768px) {
        /* Adjust breakpoint for medium screens */
        :host {
          padding: 1rem; /* Less padding on smaller screens */
        }
        .container {
          padding: 0; /* Remove container padding */
        }
        .form-card {
          padding: 2rem 1.5rem; /* Adjust padding inside card */
          border-radius: 10px;
        }
        h2 {
          font-size: 2rem;
          margin-bottom: 2rem;
        }
        h2 b {
          font-size: 1.4rem;
        }
        .form-group {
          margin-bottom: 1.5rem; /* Less spacing between form groups */
        }
        label {
          margin-bottom: 0.6rem;
        }
        input[type='text'],
        input[type='number'],
        textarea,
        select {
          padding: 0.8rem 1rem; /* Smaller input padding */
          border-radius: 6px;
        }
        select {
          background-position: right 8px center; /* Adjust arrow position */
          padding-right: 25px; /* Adjust space for arrow */
        }
        button.button-primary {
          padding: 0.9rem 1.5rem; /* Smaller primary button padding */
          font-size: 1rem;
          /* max-width: 250px; -- removed as form-actions handles width */
        }
        button.button-secondary {
          padding: 0.7rem 1.2rem;
          font-size: 0.9rem;
        }
        .file-input-container {
          flex-direction: column; /* Stack file input parts vertically */
          align-items: stretch; /* Stretch them horizontally */
          padding: 1rem;
          gap: 0.8rem; /* Less gap when stacked */
          border-radius: 6px;
        }
        .button-secondary {
          width: 100%; /* Make the choose button full width */
        }
        .file-name {
          text-align: center; /* Center filename below button */
          flex-grow: 0; /* Don't grow */
          width: 100%; /* Take full width */
          font-size: 0.9rem; /* Smaller filename text */
        }

        /* Adjust form actions on mobile */
        .form-actions {
          flex-direction: column;
          gap: 1.5rem; /* More space between stacked items */
          align-items: stretch; /* Stretch button and link */
          padding-top: 1.5rem;
          margin-top: 2rem;
        }
        .form-actions .button-primary {
          width: 100%; /* Full width button */
        }
        .form-actions .link-subtle {
          width: 100%; /* Full width link */
          text-align: center; /* Ensure centered */
          padding: 0.8rem 0; /* Adjust padding */
          font-size: 1rem;
        }

        .form-error {
          padding: 1.2rem;
          margin-bottom: 2rem;
          border-radius: 6px;
        }
        .error {
          font-size: 0.9rem;
          margin-top: 0.6rem;
        }
        .loading-spinner {
          min-height: 300px;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border-width: 5px;
        }
        .loading-spinner p {
          font-size: 1.1rem;
        }
      }
      @media (max-width: 500px) {
        /* Further adjustments for very small screens */
        .form-card {
          padding: 1.5rem;
        }
        h2 {
          font-size: 1.8rem;
          margin-bottom: 1.5rem;
        }
        h2 b {
          font-size: 1.3rem;
        }
        .form-group {
          margin-bottom: 1.2rem;
        }
        label {
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        input[type='text'],
        input[type='number'],
        textarea,
        select {
          padding: 0.7rem 0.8rem;
          font-size: 0.95rem;
        }
        select {
          padding-right: 20px;
          background-position: right 6px center;
        }
        textarea {
          min-height: 150px;
        }
        button.button-secondary {
          padding: 0.6rem 1rem;
          font-size: 0.85rem;
        }
        .file-input-container {
          padding: 0.8rem;
          gap: 0.5rem;
        }
        .file-name {
          font-size: 0.85rem;
        }

        .form-actions {
          gap: 1rem;
          padding-top: 1.2rem;
          margin-top: 1.5rem;
        }
        .form-actions .button-primary,
        .form-actions .link-subtle {
          padding: 0.7rem 1rem;
          font-size: 0.95rem;
        }

        .form-error {
          padding: 1rem;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }
        .error {
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }

        .loading-spinner {
          min-height: 250px;
          font-size: 1rem;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border-width: 4px;
          margin-bottom: 1rem;
        }
        .loading-spinner p {
          font-size: 1rem;
        }
      }
    `,
  ],
})
export class CourseEditComponent implements OnInit {
  courseService = inject(CourseService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  form = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
  });

  selectedFile: File | null = null;
  videoError: string | null = null;
  course: any;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.courseService.getCourse(id).subscribe((course) => {
      this.course = course;
      this.form.patchValue({
        title: course.title,
        description: course.description,
      });
    });
  }

  onFileChange(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        this.videoError = 'Please select a valid video file';
        this.selectedFile = null;
        event.target.value = '';
      } else {
        this.selectedFile = file;
        this.videoError = null;
      }
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const updates: any = {
        ...this.form.value,
        ...(this.selectedFile && { video: this.selectedFile }),
      };

      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.courseService.updateCourse(id, updates).subscribe({
        next: () => this.router.navigate(['/course', id]),
        error: (err) => console.error('Update failed', err),
      });
    }
  }
}
