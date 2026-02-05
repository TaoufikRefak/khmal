import { Component, inject, OnInit, OnDestroy } from '@angular/core'; // Added OnInit, OnDestroy
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CourseService } from '../services/course.service';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { Subscription } from 'rxjs'; // Import Subscription

@Component({
  selector: 'app-course-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="form-card">
        <h2>Create a New Course</h2>

        @if (form.errors?.['creationFailed']) {
        <p class="form-error">{{ form.errors?.['creationFailed'] }}</p>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="title">Course Title</label>
            <input
              id="title"
              type="text"
              formControlName="title"
              [class.invalid]="
                form.controls['title'].invalid && form.controls['title'].touched
              "
              placeholder="Enter course title"
            />
            @if (form.controls['title'].invalid &&
            form.controls['title'].touched) {
            <p class="error">Title is required.</p>
            }
          </div>

          <div class="form-group">
            <label for="description">Course Description</label>
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
            <p class="error">Description is required.</p>
            }
          </div>

          @if (isAdmin) {
          <div class="admin-section">
            <h3>Admin Details</h3>
            <div class="form-group">
              <label for="branch_id">Branch ID</label>
              <input
                id="branch_id"
                type="number"
                formControlName="branch_id"
                [class.invalid]="
                  form.controls['branch_id'].invalid &&
                  form.controls['branch_id'].touched
                "
                placeholder="e.g., 1"
              />
              @if (form.controls['branch_id'].invalid &&
              form.controls['branch_id'].touched) { @if
              (form.controls['branch_id'].errors?.['required']) {
              <p class="error">Branch ID is required.</p>
              } }
            </div>
            <div class="form-group">
              <label for="teacher_id">Teacher ID</label>
              <input
                id="teacher_id"
                type="number"
                formControlName="teacher_id"
                [class.invalid]="
                  form.controls['teacher_id'].invalid &&
                  form.controls['teacher_id'].touched
                "
                placeholder="e.g., 42"
              />
              @if (form.controls['teacher_id'].invalid &&
              form.controls['teacher_id'].touched) { @if
              (form.controls['teacher_id'].errors?.['required']) {
              <p class="error">Teacher ID is required.</p>
              } }
            </div>
          </div>
          }

          <div class="form-group">
            <label>Course Video</label>
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
                Choose Video
              </button>
              <span class="file-name">{{
                selectedFile?.name || 'No file chosen'
              }}</span>
            </div>
            @if (videoError) {
            <p class="error">{{ videoError }}</p>
            }
          </div>

          <button
            type="submit"
            class="button-primary"
            [disabled]="form.invalid || !selectedFile || !!videoError"
          >
            Create Course
          </button>
        </form>
        <a routerLink="/courses" class="link-subtle">Cancel</a>
      </div>
    </div>
  `,
  /* Updated styles block */
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
        margin-top: 3rem; /* More space above the primary button */
        width: 100%; /* Make primary button full width */
        max-width: 300px; /* Max width for primary button */
        display: block; /* Ensure it takes its own line */
        margin-left: auto; /* Center the button */
        margin-right: auto; /* Center the button */
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

      /* Admin Section */
      .admin-section {
        background: rgba(
          167,
          201,
          87,
          0.2
        ); /* Light Green/Yellow tint background */
        border-radius: 10px;
        padding: 2.5rem; /* Generous padding inside admin section */
        margin: 3rem 0; /* Space above and below section */
        border: 1px solid rgba(56, 102, 65, 0.2); /* Subtle green border */
        box-shadow: inset 0 1px 3px rgba(56, 102, 65, 0.05); /* Subtle inner shadow */
      }
      .admin-section h3 {
        color: #386641; /* Dark Green */
        font-size: 1.4rem; /* Larger admin heading */
        margin-bottom: 1.8rem; /* Space below heading */
        font-weight: 700; /* Bolder */
        text-align: center; /* Center admin heading */
      }
      .admin-section .form-group {
        margin-bottom: 1.5rem; /* Standard spacing inside admin groups */
      }

      /* Link - Subtle secondary action (Cancel) */
      .link-subtle {
        display: block; /* Make link take its own line */
        text-align: center;
        color: rgba(56, 102, 65, 0.7); /* Muted dark green */
        margin-top: 2rem; /* Space above the link */
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

      /* Form Level Error Styling (for creationFailed) */
      .form-error {
        /* Class name from your template */
        /* Keep red for clear error indication */
        color: #bc4749; /* Red */
        background: rgba(188, 71, 73, 0.1); /* Light red tint background */
        padding: 1.5rem; /* Generous padding */
        border-radius: 8px; /* Matches inputs */
        margin-bottom: 2.5rem; /* More space below the error message */
        text-align: center;
        font-weight: 600;
        border: 1px solid rgba(188, 71, 73, 0.3); /* Matching border */
        box-shadow: 0 1px 6px rgba(188, 71, 73, 0.1); /* Subtle shadow */
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
          max-width: 250px; /* Reduce max width */
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
        .admin-section {
          padding: 1.5rem;
          margin: 2.5rem 0;
          border-radius: 8px;
        }
        .admin-section h3 {
          font-size: 1.3rem;
          margin-bottom: 1.2rem;
        }
        .admin-section .form-group {
          margin-bottom: 1.2rem;
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
        button.button-primary {
          padding: 0.8rem 1rem;
          font-size: 0.95rem;
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
        .admin-section {
          padding: 1rem;
          margin: 2rem 0;
        }
        .admin-section h3 {
          font-size: 1.1rem;
          margin-bottom: 1rem;
        }
        .admin-section .form-group {
          margin-bottom: 1rem;
        }
        .form-error {
          padding: 1rem;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }
        .link-subtle {
          margin-top: 1.5rem;
          font-size: 0.9rem;
        }
      }
    `,
  ],
})
export class CourseCreateComponent implements OnInit, OnDestroy {
  courseService = inject(CourseService);
  authService = inject(AuthService);
  router = inject(Router);

  isAdmin: boolean;

  constructor() {
    this.isAdmin = this.authService.hasRole('admin');
    this.form = new FormGroup({
      title: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
      ...(this.isAdmin
        ? {
            branch_id: new FormControl<number | null>(
              null,
              Validators.required
            ),
            teacher_id: new FormControl<number | null>(
              null,
              Validators.required
            ),
          }
        : {}),
    });
  }

  form!: FormGroup;
  private subscriptions = new Subscription();
  selectedFile: File | null = null;
  videoError: string | null = null;

  ngOnInit() {
    // Keep if needed for future async admin status updates
    // Initial validators for admin fields are set in the constructor
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const fileSizeMb = file.size / 1024 / 1024;
      const maxFileSizeMb = 500;

      if (!file.type.startsWith('video/')) {
        this.selectedFile = null;
        this.videoError = 'Please select a valid video file.';
        if (input) {
          input.value = '';
        }
      } else if (fileSizeMb > maxFileSizeMb) {
        // Check size *after* type
        this.selectedFile = null;
        this.videoError = `File is too large (${fileSizeMb.toFixed(
          2
        )} MB). Maximum size is ${maxFileSizeMb} MB.`;
        if (input) {
          input.value = '';
        }
      } else {
        this.selectedFile = file;
        this.videoError = null; // Clear previous error on success
      }
    } else {
      this.selectedFile = null;
      this.videoError = 'Please select a video file.';
    }
  }

  onSubmit() {
    // Mark fields as touched to show validation messages immediately on submit attempt
    this.form.markAllAsTouched();

    // Check for file and potentially set error *before* form.valid check
    if (!this.selectedFile) {
      this.videoError = this.videoError || 'Please select a video file.'; // Set generic error if not specific size/type issue
    } else if (this.videoError) {
      // File is selected but validation failed (size/type already handled in onFileChange)
      // Do nothing here, error is already set and should block submission
    } else {
      this.videoError = null; // Ensure error is null if a valid file is selected
    }

    // Clear previous form-level errors from API failure
    this.form.setErrors(null);

    if (this.form.valid && this.selectedFile && !this.videoError) {
      console.log('Form and File valid, attempting course creation...');

      const formData = this.form.getRawValue();

      // Filter out null/undefined/empty strings from form data, especially for optional fields
      const courseData = {
        title: formData.title,
        description: formData.description,
        video: this.selectedFile,
        branch_id: formData.branch_id || null,
        teacher_id: formData.teacher_id || null,
      };

      // Only include admin fields if user is admin
      if (this.isAdmin) {
        courseData['branch_id'] = Number(formData.branch_id);
        courseData['teacher_id'] = Number(formData.teacher_id);
      }

      this.courseService.createCourse(courseData).subscribe({
        next: () => {
          console.log('Course creation successful, navigating...');
          this.router.navigate(['/course']); // Navigate on success
        },
        error: (err) => {
          console.error('Course creation failed:', err);
          const errorMessage =
            err?.error?.message || 'Course creation failed. Please try again.';
          this.form.setErrors({ creationFailed: errorMessage }); // Set form-level error
          // Don't navigate on error
        },
      });
    } else {
      console.log(
        'Form invalid, file missing, or file validation failed. Creation not attempted.'
      );
      console.log('Form Validity:', this.form.valid);
      console.log('File Selected:', !!this.selectedFile);
      console.log('Video Error:', this.videoError);
    }
  }
}
