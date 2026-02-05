import { Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserService } from '../services/user.service';
import { AuthService } from '../../auth/services/auth.service';
import { NgIf } from '@angular/common'; // Keep imports as they were
import { UserUpdateDto } from '../user.model';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, NgIf], // Keep imports as they were
  template: `
    <!-- Your HTML Template goes here -->
    <!-- You will need to add CSS classes as instructed below -->

    <div class="container profile-page-container">
      <!-- Add class="dashboard-title" to your main heading -->
      <h1 class="dashboard-title">Profile</h1>

      <!-- Use ngIf directly on the container if possible, or wrap form/loading state -->
      <!-- Add alert classes to loading and error messages -->
      <div *ngIf="userService.loading()" class="alert alert-info">
        <span class="spinner"></span> Loading profile...
      </div>
      <div *ngIf="userService.error()" class="alert alert-danger">
        <span class="icon-warning">!</span> Error: {{ userService.error() }}
      </div>

      <div *ngIf="userService.currentUser() as user">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <!-- Wrap each label/input pair in a div with class="form-group" -->
          <div class="form-group">
            <label for="name">
              Name:
              <input
                id="name"
                type="text"
                formControlName="name"
                autocomplete="name"
              />
            </label>
            <!-- Add validation messages here if you like, wrapped in class="validation-error" -->
          </div>

          <div class="form-group">
            <label for="email">
              Email:
              <input
                id="email"
                type="email"
                formControlName="email"
                autocomplete="email"
              />
            </label>
            <!-- Add validation messages here -->
          </div>

          <div class="form-group" *ngIf="authService.hasRole('admin')">
            <label for="role">
              Role:
              <select id="role" formControlName="role">
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </label>
          </div>

          <div class="form-group" *ngIf="authService.hasRole('admin')">
            <label for="branch_id">
              Branch ID:
              <input id="branch_id" type="number" formControlName="branch_id" />
            </label>
          </div>

          <!-- Add classes="btn btn-primary btn-full-width" to your button -->
          <button
            type="submit"
            class="btn btn-primary btn-full-width"
            [disabled]="form.invalid"
          >
            Update
          </button>
        </form>
      </div>

      <!-- Keep your ng-template loading block if it's used elsewhere, but the alerts above replace its primary use here -->
      <!-- <ng-template #loading> ... </ng-template> -->
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
        align-items: flex-start; /* Align to top, good for long forms */
        padding: 2rem; /* Comfortable padding */
        /* Use the very light beige as the background */
        background-color: #f2e8cf;
        color: #386641; /* Use the dark green for main text */
        min-height: 100vh; /* Ensure it takes at least viewport height */
        box-sizing: border-box; /* Include padding/border in element's size */
      }

      /* --- CONTAINER --- */
      /* Apply this class to a wrapper div around your main content */
      .profile-page-container {
        /* Your template uses this class */
        max-width: 600px; /* Max width for the form card */
        width: 100%; /* Ensure it's responsive */
        background-color: #ffffff; /* Keep white for the form card for cleanliness */
        padding: 2.5rem; /* Increased padding inside the card */
        border-radius: 12px; /* More rounded corners */
        box-shadow: 0 10px 30px rgba(56, 102, 65, 0.1); /* Subtle shadow using dark green */
        margin: 0 auto; /* Center block element up to max-width */
        box-sizing: border-box; /* Ensure padding/border included */
      }

      /* --- TITLE --- */
      /* Apply this class to your h1 or h2 heading */
      .dashboard-title {
        /* Your template uses this class */
        color: #386641; /* Dark Green */
        margin-top: 0; /* Remove default margin top */
        margin-bottom: 1.8rem; /* Space below title */
        font-size: 2.4rem; /* Larger title font */
        font-weight: 700; /* Bolder */
        border-bottom: 2px solid rgba(56, 102, 65, 0.2); /* Subtle green separator */
        padding-bottom: 1.2rem; /* Padding below title text */
        text-align: left; /* Align title left */
        line-height: 1.2;
      }

      /* --- FORM LAYOUT --- */
      form {
        display: flex; /* Arrange form elements */
        flex-direction: column; /* Stack elements vertically */
        gap: 1.5rem; /* Space between form groups */
      }

      /* Apply this class to a div wrapping each label and input/select */
      .form-group {
        /* Your template uses this class */
        display: flex;
        flex-direction: column; /* Stack label above input */
      }

      /* --- LABELS --- */
      label {
        margin-bottom: 0.5rem; /* Space below label */
        font-weight: 600; /* Semi-bold label text */
        color: #386641; /* Use Dark Green for labels */
        font-size: 1rem; /* Standard label font size */
        display: block; /* Ensure label takes full width */
      }

      /* --- INPUTS & SELECTS --- */
      input[type='text'],
      input[type='email'],
      input[type='number'],
      select {
        padding: 0.8rem 1.2rem; /* Comfortable padding */
        border: 1px solid rgba(56, 102, 65, 0.3); /* Subtle green border */
        border-radius: 8px; /* Rounded corners */
        font-size: 1rem;
        color: #386641; /* Dark green text color */
        background-color: #fff; /* White background */
        transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out; /* Smooth transitions */
        width: 100%; /* Make inputs full width of parent (.form-group) */
        box-sizing: border-box; /* Include padding/border in element's total width */
      }

      /* Custom SVG arrow for select */
      select {
        appearance: none; /* Remove default system arrow */
        background-image: url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3e%3cpath fill=%27none%27 stroke=%27%23386641%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m2 5 6 6 6-6%27/%3e%3c/svg%3e'); /* Dark Green arrow */
        background-repeat: no-repeat;
        background-position: right 1rem center;
        background-size: 12px;
        padding-right: 2.5rem; /* Ensure space for the custom arrow */
      }

      input:focus,
      select:focus {
        /* Focus styling */
        border-color: #386641; /* Dark Green on focus */
        outline: 0; /* Remove default outline */
        box-shadow: 0 0 0 0.2rem rgba(56, 102, 65, 0.2); /* Subtle green glow */
      }

      input:disabled,
      select:disabled {
        /* Disabled state styling */
        background-color: rgba(56, 102, 65, 0.05); /* Very light green tint */
        color: rgba(56, 102, 65, 0.5); /* Muted dark green text */
        cursor: not-allowed; /* Indicate it's not interactive */
        opacity: 0.8; /* Slightly faded */
      }

      /* --- BUTTONS --- */
      /* Apply this class to your button */
      .btn {
        /* Your template uses this class */
        padding: 0.75rem 1.5rem; /* Comfortable padding */
        border: none;
        border-radius: 8px; /* Slightly more rounded */
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600; /* Semi-bold */
        transition: background-color 0.2s ease-in-out, opacity 0.2s ease-in-out,
          transform 0.2s ease-in-out; /* Smooth transition */
        text-decoration: none; /* Ensure no underline on anchor tags */
        display: inline-flex; /* Use flex for alignment (e.g., text + icon) */
        align-items: center;
        justify-content: center;
        gap: 0.4rem; /* Space between text and icon */
      }

      /* Apply this class for the primary action button */
      .btn-primary {
        /* Your template uses this class */
        background-color: #386641; /* Dark Green */
        color: #fff; /* White text */
        box-shadow: 0 4px 15px rgba(56, 102, 65, 0.3); /* Matching vibrant shadow */
      }

      .btn-primary:hover:not(:disabled) {
        background-color: #2b4c31; /* Darker green on hover */
        box-shadow: 0 6px 20px rgba(56, 102, 65, 0.4);
        transform: translateY(-2px); /* Subtle lift */
      }
      .btn-primary:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(56, 102, 65, 0.4);
      }

      /* Apply this class to make the button full width */
      .btn-full-width {
        /* Your template uses this class */
        display: block; /* Make it a block element */
        width: 100%; /* Full width */
        margin-top: 2rem; /* Space above the button */
        padding: 1rem 1.5rem; /* More vertical padding for full width */
        font-size: 1.1rem; /* Larger font for full width button */
      }

      /* Styling for the disabled button state */
      button:disabled {
        background: rgba(56, 102, 65, 0.3); /* Muted green tint */
        color: rgba(255, 255, 255, 0.6); /* Muted white text */
        cursor: not-allowed;
        opacity: 0.7;
        box-shadow: none;
        transform: none; /* No animation when disabled */
      }

      /* --- LOADING & ERROR ALERTS --- */
      /* Apply .alert and .alert-info or .alert-danger to your message divs */
      .alert {
        /* Your template uses this class */
        padding: 1.5rem; /* Spacious padding */
        margin-bottom: 2rem; /* Space below the alert */
        border: 1px solid transparent;
        border-radius: 8px; /* Matching radius */
        font-size: 1rem;
        text-align: center;
        display: flex; /* Layout icon and text */
        align-items: center;
        justify-content: center;
        gap: 0.8rem; /* Space between icon/spinner and text */
      }

      .alert-info {
        /* Your template uses this class */
        color: #386641; /* Dark Green text */
        background-color: rgba(
          167,
          201,
          87,
          0.2
        ); /* Light Green/Yellow tint background */
        border-color: rgba(167, 201, 87, 0.5); /* More prominent border color */
      }

      .alert-danger {
        /* Your template uses this class */
        color: #bc4749; /* Red text */
        background-color: rgba(188, 71, 73, 0.1); /* Light red background */
        border-color: rgba(188, 71, 73, 0.3); /* More prominent border color */
      }

      /* Apply .spinner class for a loading indicator */
      .spinner {
        /* Your template uses this class */
        border: 4px solid rgba(56, 102, 65, 0.3); /* Light green border */
        border-top: 4px solid #386641; /* Dark Green spinner */
        border-radius: 50%;
        width: 24px;
        height: 24px;
        animation: spin 1s linear infinite; /* Rotation animation */
        display: inline-block;
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

      /* Apply .icon-warning class for an error icon */
      .icon-warning {
        /* Add this class to your error icon */
        font-size: 1.4rem;
        font-weight: bold;
        line-height: 1; /* Ensure vertical alignment */
        flex-shrink: 0; /* Prevent shrinking */
      }

      /* --- OPTIONAL: VALIDATION ERRORS --- */
      /* Apply this class to divs/spans showing validation errors */
      .validation-error {
        /* This class is in your template, but not styled in the base CSS block provided earlier */
        color: #bc4749; /* Red color */
        font-size: 0.85rem; /* Smaller text */
        margin-top: 0.3rem; /* Space above message */
        display: block; /* Ensure it takes full width */
        font-weight: 500;
      }

      /* --- Responsive Adjustments --- */
      @media (max-width: 576px) {
        .profile-page-container {
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
        /* Adjust text input padding on smaller screens */
        input[type='text'],
        input[type='email'],
        input[type='number'],
        select {
          padding: 0.6rem 1rem;
          font-size: 0.95rem;
        }
        select {
          background-position: right 0.8rem center;
          background-size: 10px;
          padding-right: 2rem;
        }
        .btn-full-width {
          padding: 0.8rem 1.5rem;
          font-size: 1rem;
          margin-top: 1.5rem;
        }
        .alert {
          padding: 1rem;
          margin-bottom: 1.5rem;
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
        .validation-error {
          font-size: 0.8rem;
          margin-top: 0.2rem;
        }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  userService = inject(UserService);
  authService = inject(AuthService);

  // Your original FormGroup definition
  form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    role: new FormControl({
      value: '',
      disabled: !this.authService.hasRole('admin'),
    }),
    branch_id: new FormControl<number | null>(null),
  });

  ngOnInit() {
    // Your original ngOnInit logic
    this.userService.loadCurrentUser().subscribe();

    this.userService.currentUser$.subscribe((user) => {
      if (user) {
        this.form.patchValue(
          {
            name: user.name,
            email: user.email,
            role: user.role,
            branch_id: user.branch_id ?? null,
          },
          { emitEvent: false }
        );
      }
    });
  }

  onSubmit() {
    // Your original onSubmit logic
    if (this.form.valid) {
      const currentUser = this.userService.currentUser();
      if (!currentUser) return;

      const updates: UserUpdateDto = {
        name: this.form.value.name!,
        email: this.form.value.email!,
        ...(this.authService.hasRole('admin') && {
          role:
            (this.form.value.role as 'admin' | 'student' | 'teacher') ??
            undefined,
          branch_id: this.form.value.branch_id ?? undefined,
        }),
      };

      this.userService.updateUser(currentUser.id, updates).subscribe({
        error: (err) => alert('Update failed: ' + err.message),
      });
    }
  }
}
