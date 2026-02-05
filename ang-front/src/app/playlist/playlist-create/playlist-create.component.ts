import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf, CommonModule } from '@angular/common'; // Ensure CommonModule is included
import { PlaylistService } from '../services/playlist.service';

@Component({
  selector: 'app-playlist-create',
  standalone: true,
  // Include CommonModule and RouterLink
  imports: [ReactiveFormsModule, RouterLink, NgIf, CommonModule],
  template: `
    <!-- Wrap content in container -->
    <div class="container page-container">
      <!-- Apply dashboard-title style -->
      <h2 class="dashboard-title">Create New Playlist</h2>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <!-- Apply form-group class to input divs -->
        <div class="form-group">
          <label for="name">Playlist Name:</label>
          <!-- Add 'for' attribute -->
          <input id="name" formControlName="name" autocomplete="off" />
          <!-- Add 'id' attribute -->
          <!-- Apply validation-error class -->
          <div
            *ngIf="
              form.controls['name'].invalid &&
              (form.controls['name'].dirty || form.controls['name'].touched)
            "
            class="validation-error"
          >
            Name is required.
          </div>
        </div>

        <!-- Separate div for the custom checkbox form-group -->
        <div class="form-group form-group-checkbox">
          <!--
             To style checkboxes elegantly, we hide the native input
             and style the label's pseudo-element.
             Need to adjust HTML structure slightly from your original:
             Ensure label follows immediately after the hidden input OR
             Wrap the checkbox AND a separate label inside the main label
             Or, the most robust way: Use separate label with 'for' and
             style pseudo-element on the *label* when input *with id* is checked
             Here we'll use a combination with specific classes.
           -->
          <input
            type="checkbox"
            id="is_public"
            formControlName="is_public"
            class="styled-checkbox"
          />
          <label for="is_public" class="styled-checkbox-label"
            >Public Playlist</label
          >
        </div>

        <!-- Apply actions container -->
        <div class="actions">
          <!-- Apply btn and btn-primary classes -->
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="form.invalid || playlistService.loading()"
          >
            Create Playlist
          </button>
          <!-- Apply btn-link class -->
          <a routerLink="/playlist" class="btn btn-link">Cancel</a>
          <!-- Changed path to /playlist? -->
        </div>
      </form>

      <!-- Loading and error messages, apply alert styles -->
      <!-- Assuming playlistService has loading and error signals/observables like userService -->
      <div *ngIf="playlistService.loading()" class="alert alert-info">
        <span class="spinner"></span> Creating playlist...
      </div>
      <div
        *ngIf="playlistService.error() as createError"
        class="alert alert-danger"
      >
        <span class="icon-warning">!</span> Error:
        {{ createError }}
      </div>
    </div>
    <!-- Close container -->
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
        align-items: flex-start; /* Align to top, good for long forms */
        padding: 2rem;
        /* Use the very light beige as the background */
        background-color: #f2e8cf;
        color: #386641; /* Use the dark green for main text */
        min-height: 100vh;
        box-sizing: border-box;
      }

      /* --- CONTAINER --- */
      /* Wrapper around the whole form content */
      .page-container {
        /* Your template uses this class */
        max-width: 500px; /* Adjust width for the form */
        width: 100%;
        background-color: #ffffff; /* Keep white for crisper form card */
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
        margin-bottom: 1.8rem;
        font-size: 2rem;
        font-weight: 600;
        border-bottom: 2px solid rgba(56, 102, 65, 0.2); /* Subtle green border */
        padding-bottom: 1.2rem;
        text-align: left; /* Forms usually have left-aligned titles */
      }

      /* --- FORM LAYOUT --- */
      form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem; /* Space between form groups */
      }

      /* Wrapper for label and input/checkbox */
      .form-group {
        /* Your template uses this class */
        display: flex;
        flex-direction: column;
        gap: 0.5rem; /* Space between label and input/messages */
      }

      /* Specific layout for checkbox group */
      .form-group-checkbox {
        /* Your template uses this class */
        flex-direction: row; /* Keep label/checkbox side-by-side initially */
        align-items: center; /* Vertically center them */
        gap: 0.8rem; /* Space between custom checkbox and text */
        padding-top: 0.5rem; /* Add slight padding */
      }

      /* --- LABELS --- */
      label {
        font-weight: 600;
        color: #386641; /* Use Dark Green for labels */
        font-size: 0.95rem; /* Slightly larger label text */
        display: block;
      }

      /* Style the custom checkbox label */
      .styled-checkbox-label {
        /* Your template uses this class */
        font-weight: normal; /* Regular weight for checkbox label text */
        color: #386641; /* Dark Green text color */
        font-size: 1rem; /* Standard size */
        cursor: pointer;
        user-select: none;
        display: inline-flex; /* Align content inside label if needed */
        align-items: center; /* Vertical alignment with pseudo-element */
        gap: 0.8rem; /* Space between pseudo-element and text */
      }

      /* --- INPUTS & SELECTS --- */
      /* Standard text/number inputs */
      input[type='text'],
      input[type='number'] {
        padding: 0.8rem 1.2rem; /* Generous padding */
        border: 1px solid rgba(56, 102, 65, 0.3); /* Subtle green border */
        border-radius: 8px; /* Rounded corners */
        font-size: 1rem;
        color: #386641; /* Dark Green text */
        background-color: #ffffff; /* White background */
        transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        width: 100%;
        box-sizing: border-box;
      }

      /* Custom Checkbox Styling */
      input[type='checkbox'].styled-checkbox {
        /* Your template uses this class */
        /* Hide native checkbox */
        position: absolute;
        opacity: 0;
        width: 1.5em; /* Still give it some area for easier clicking/touch */
        height: 1.5em;
        z-index: 1; /* Ensure it's above visual elements */
        cursor: pointer;
      }

      /* Visual representation of the checkbox (pseudo-element on label) */
      .styled-checkbox-label::before {
        content: '';
        display: inline-block;
        width: 1.2em; /* Size of the box */
        height: 1.2em;
        flex-shrink: 0; /* Prevent it from shrinking */
        border: 2px solid rgba(56, 102, 65, 0.5); /* Muted green border */
        border-radius: 4px; /* Slightly rounded corners */
        background-color: #fff; /* White background */
        transition: border-color 0.2s ease-in-out,
          background-color 0.2s ease-in-out;
        box-sizing: border-box; /* Include border in size */
      }

      /* Checked state */
      input[type='checkbox'].styled-checkbox:checked
        + .styled-checkbox-label::before {
        background-color: #386641; /* Dark Green when checked */
        border-color: #386641; /* Matching border */
        content: url('data:image/svg+xml,%3Csvg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M9.55 18.35L4.35 13.15L5.75 11.75L9.55 15.55L18.25 6.85L19.65 8.25L9.55 18.35Z"/%3E%3C/svg%3E'); /* White checkmark SVG */
        background-size: 1em 1em; /* Adjust SVG size */
        background-position: center;
        background-repeat: no-repeat;
      }

      /* Focus state (Apply to the hidden input, style the label) */
      input[type='checkbox'].styled-checkbox:focus
        + .styled-checkbox-label::before {
        outline: 0;
        box-shadow: 0 0 0 0.2rem rgba(56, 102, 65, 0.2); /* Subtle green glow */
        border-color: #386641; /* Dark Green border on focus */
      }

      /* Hover state for the label */
      .styled-checkbox-label:hover::before {
        border-color: #386641; /* Dark Green border on label hover */
      }

      /* Input/Select Focus State */
      input[type='text']:focus,
      input[type='number']:focus {
        border-color: #386641; /* Dark Green */
        outline: 0;
        box-shadow: 0 0 0 0.2rem rgba(56, 102, 65, 0.2); /* Matching subtle glow */
      }

      /* Invalid Input State */
      input.invalid {
        /* Checkbox invalid state is handled by .validation-error */
        border-color: #bc4749; /* Red */
        background: rgba(188, 71, 73, 0.05); /* Very light red tint */
        box-shadow: 0 0 0 0.2rem rgba(188, 71, 73, 0.1);
      }

      /* Disabled Input State */
      input:disabled,
      select:disabled {
        background-color: rgba(56, 102, 65, 0.05); /* Very light green tint */
        color: rgba(56, 102, 65, 0.5); /* Muted dark green text */
        cursor: not-allowed;
        opacity: 0.8;
      }

      /* --- BUTTONS & LINKS --- */

      /* Button base style (using .btn) */
      .btn {
        /* Your template uses this class */
        padding: 0.75rem 1.5rem; /* Generous padding */
        border: none;
        border-radius: 8px; /* Rounded corners */
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600; /* Semi-bold */
        transition: background-color 0.2s ease-in-out, opacity 0.2s ease-in-out,
          transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        text-decoration: none;
        display: inline-flex; /* Align text/icon */
        align-items: center;
        justify-content: center;
        gap: 0.4rem;

        /* Optional Hover Lift Effect */
        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        &:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
      }

      /* Primary button style */
      .btn-primary {
        /* Your template uses this class */
        background-color: #386641; /* Dark Green */
        color: #ffffff; /* White text for contrast */
        box-shadow: 0 4px 15px rgba(56, 102, 65, 0.3); /* Matching shadow */

        &:hover:not(:disabled) {
          background-color: #2b4c31; /* Darker shade */
          box-shadow: 0 6px 20px rgba(56, 102, 65, 0.4);
        }
      }

      /* Disabled button style */
      button:disabled {
        background: rgba(56, 102, 65, 0.3); /* Muted green tint */
        color: rgba(255, 255, 255, 0.6); /* Muted white text */
        cursor: not-allowed;
        opacity: 0.7;
        box-shadow: none;
        transform: none; /* No transform when disabled */
      }

      /* Link styled as button */
      .btn-link {
        /* Your template uses this class */
        background: none;
        color: rgba(56, 102, 65, 0.7); /* Muted dark green for cancel */
        padding: 0.75rem 1.5rem; /* Match padding for alignment */
        border: none;
        border-radius: 8px;
        /* Optional hover effect on link-button */
        &:hover {
          color: #386641; /* Dark Green on hover */
          text-decoration: underline; /* Optional underline */
        }
        /* No transform on btn-link unless explicitly added */
      }

      /* --- ACTIONS CONTAINER --- */
      /* Div wrapping the submit button and cancel link */
      .actions {
        /* Your template uses this class */
        margin-top: 2rem; /* Space above actions */
        display: flex; /* Layout buttons/link */
        gap: 1rem; /* Space between items */
        align-items: center; /* Vertically align items */
      }

      /* --- VALIDATION ERRORS --- */
      /* Style for the validation error message div/p */
      .validation-error {
        /* Your template uses this class */
        color: #bc4749; /* Red */
        font-size: 0.85rem;
        margin-top: 0.3rem; /* Space above message */
        display: block; /* Ensure it takes full width */
        font-weight: 500;
      }

      /* --- LOADING & ERROR ALERTS --- */
      /* Applying consistent alert styles */
      .alert {
        /* Your template uses this class */
        padding: 1.2rem 1.5rem;
        margin-top: 2rem; /* Space above alert */
        margin-bottom: 0; /* No margin below alert if last element */
        border: 1px solid transparent;
        border-radius: 8px; /* Medium border radius */
        font-size: 1rem;
        text-align: left; /* Align text left in alert */
        display: flex;
        align-items: center;
        gap: 0.8rem;
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
        flex-shrink: 0; /* Prevent shrinking */
      }

      /* Icon for Error (Use within .alert-danger) */
      .icon-warning {
        /* Add this class to an element inside alert-danger */
        font-size: 1.4rem;
        font-weight: bold;
        line-height: 1; /* Keep icon vertically aligned */
        flex-shrink: 0; /* Prevent shrinking */
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      /* --- Responsive Adjustments --- */
      @media (max-width: 576px) {
        .page-container {
          padding: 1.5rem; /* Less padding on smaller screens */
          border-radius: 10px;
        }
        .dashboard-title {
          font-size: 1.8rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
        }
        form {
          gap: 1.2rem; /* Less space between form groups */
        }
        label {
          font-size: 0.9rem;
        }
        .actions {
          flex-direction: column; /* Stack buttons vertically */
          gap: 0.8rem; /* Closer gap */
          margin-top: 1.5rem;
        }
        .actions .btn,
        .actions .btn-link {
          width: 100%; /* Full width for stacked items */
          text-align: center;
          padding: 0.6rem 1rem; /* Adjust button padding */
          font-size: 0.95rem;
        }
        /* Adjust text input padding on smaller screens */
        input[type='text'],
        input[type='number'] {
          padding: 0.6rem 1rem;
          font-size: 0.95rem;
        }
        .styled-checkbox-label {
          font-size: 0.9rem;
          gap: 0.6rem;
        }
        .styled-checkbox-label::before {
          width: 1em;
          height: 1em;
          border-width: 1px; /* Slightly thinner border */
        }
        input[type='checkbox'].styled-checkbox:checked
          + .styled-checkbox-label::before {
          background-size: 0.9em 0.9em;
        }
        .validation-error {
          font-size: 0.8rem;
          margin-top: 0.2rem;
        }
        .alert {
          padding: 1rem;
          margin-top: 1.5rem;
          border-radius: 6px;
          font-size: 0.95rem;
          gap: 0.6rem;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border-width: 3px;
        }
        .icon-warning {
          font-size: 1.2rem;
        }
      }
    `,
  ],
})
export class PlaylistCreateComponent {
  public playlistService = inject(PlaylistService);
  private router = inject(Router);
  form: FormGroup;

  // Assume playlistService has a loading signal/observable for current creation state
  // And an error signal/observable for create errors
  playlistServiceLoading = this.playlistService.loading; // Assuming loading() signal
  playlistServiceError = this.playlistService.error; // Assuming error() signal

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      is_public: [false],
    });
  }

  onSubmit() {
    // Mark controls touched to show validation errors immediately on submit
    this.form.markAllAsTouched();

    if (this.form.valid && !this.playlistService.loading()) {
      // Prevent double submission
      this.playlistService.createPlaylist(this.form.value).subscribe({
        next: () => {
          console.log('Playlist created successfully');
          // Show success message?
          this.router.navigate(['/playlist']); // Use the same path as your links
        },
        error: (err) => {
          console.error('Failed to create playlist', err);
          // Update service error state if you have one, or handle here (alert, toast, etc.)
          alert(
            'Failed to create playlist: ' +
              (err.error?.message ||
                err.message ||
                'An unknown error occurred.')
          ); // Use err.error if backend returns error
        },
      });
    } else if (this.form.invalid) {
      // Optional: Provide user feedback if form is invalid on submit attempt
      console.log('Form is invalid, please fix errors.');
      alert('Please fill out the required fields.');
    }
  }
}
