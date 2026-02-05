import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../services/user.service';
import { AuthService } from '../../auth/services/auth.service';
import { NgIf, CommonModule } from '@angular/common'; // Added CommonModule
import { UserUpdateDto } from '../user.model';
import { User } from '../user.model';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, RouterLink, CommonModule], // Include CommonModule
  template: `
    <!-- Wrap your main content in a container div -->
    <div class="container page-container">
      <!-- The *ngIf="user; else loading" is fine as is, but content inside will use new classes -->
      <div *ngIf="user; else loading">
        <!-- Add class="dashboard-title" to your h2 -->
        <h2 class="dashboard-title">Edit User: {{ user.name }}</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <!-- Wrap each label/input or label/select pair in a div with class="form-group" -->
          <div class="form-group">
            <label for="name">Name:</label>
            <!-- Add 'for' attribute -->
            <input
              id="name"
              type="text"
              formControlName="name"
              autocomplete="name"
            />
            <!-- Add 'id' attribute -->
            <!-- Apply class="validation-error" to the error paragraph -->
            <div
              *ngIf="
                form.controls.name.invalid &&
                (form.controls.name.dirty || form.controls.name.touched)
              "
              class="validation-error"
            >
              <span *ngIf="form.controls.name.errors?.['required']"
                >Name is required.</span
              >
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email:</label>
            <!-- Add 'for' attribute -->
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
            />
            <!-- Add 'id' attribute -->
            <!-- Apply class="validation-error" to error paragraphs -->
            <div
              *ngIf="
                form.controls.email.invalid &&
                (form.controls.email.dirty || form.controls.email.touched)
              "
              class="validation-error"
            >
              <span *ngIf="form.controls.email.errors?.['required']"
                >Email is required.</span
              >
              <span *ngIf="form.controls.email.errors?.['email']"
                >Invalid email format.</span
              >
            </div>
          </div>

          <div class="form-group" *ngIf="authService.hasRole('admin')">
            <label for="role">Role:</label>
            <!-- Add 'for' attribute -->
            <select id="role" formControlName="role">
              <!-- Add 'id' attribute -->
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div class="form-group" *ngIf="authService.hasRole('admin')">
            <label for="branch_id">Branch ID:</label>
            <!-- Add 'for' attribute -->
            <input id="branch_id" type="number" formControlName="branch_id" />
            <!-- Add 'id' attribute -->
            <!-- Optional: add validation error -->
          </div>

          <!-- Keep class="actions", but style it using flexbox in CSS -->
          <div class="actions">
            <!-- Apply classes="btn btn-primary" to the Save button -->
            <!-- Added form.pristine check to disable button if no changes -->
            <!-- Added userService.loading() check to disable while saving -->
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="
                form.invalid || form.pristine || userService.loading()
              "
            >
              Save Changes
            </button>
            <!-- Apply classes="btn btn-link" to the Cancel link -->
            <a [routerLink]="['/admin/users']" class="btn btn-link">Cancel</a>
          </div>
        </form>
      </div>

      <!-- The ng-template loading block -->
      <ng-template #loading>
        <!-- Apply classes="alert alert-info" to the loading paragraph -->
        <p *ngIf="userService.loading()" class="alert alert-info">
          <span class="spinner"></span> Loading user...
          <!-- Add spinner span -->
        </p>
        <!-- Apply classes="alert alert-danger" to the error paragraph -->
        <p *ngIf="userService.error()" class="alert alert-danger">
          <span class="icon-warning">!</span> {{ userService.error() }}
          <!-- Add warning icon span -->
        </p>
      </ng-template>
    </div>
    <!-- Close the container div -->
  `,
  styles: [
    `
      /* --- BASE STYLES --- */
      /* Apply to the host element */
      :host {
        font-family: 'Inter', 'Arial', sans-serif; /* Added Inter, Arial fallback */
        display: flex; /* Use flex to center container */
        justify-content: center; /* Center horizontally */
        align-items: flex-start; /* Align to top */
        padding: 2rem; /* Comfortable padding */
        background-color: #eef2f7; /* Light, slightly tinted background */
        min-height: 100vh; /* Ensure it takes at least viewport height */
        box-sizing: border-box; /* Include padding/border in element's size */
        color: #344767; /* Darker, more corporate text color */
      }

      /* --- CONTAINER --- */
      /* Apply this class to a wrapper div around your main content */
      .page-container {
        /* Reusing class name for consistency */
        max-width: 600px; /* Max width for the form card */
        width: 100%; /* Ensure it's responsive */
        background-color: #ffffff; /* White background for the card */
        padding: 2.5rem; /* Increased padding inside the card */
        border-radius: 12px; /* More rounded corners */
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); /* Softer, slightly larger shadow */
        margin: 0 auto; /* Center block element up to max-width */
      }

      /* --- TITLE --- */
      /* Apply this class to your h2 heading */
      .dashboard-title {
        color: #4a5a8d; /* A slightly deeper blue/indigo for title */
        margin-top: 0; /* Remove default margin top */
        margin-bottom: 1.8rem; /* Space below title */
        font-size: 2rem; /* Larger title font */
        font-weight: 600; /* Semi-bold */
        border-bottom: 2px solid #d8e0eb; /* Subtle separator */
        padding-bottom: 1.2rem; /* Padding below title text */
        text-align: left; /* Align title left */
      }

      /* --- FORM LAYOUT --- */
      form {
        display: flex; /* Arrange form elements */
        flex-direction: column; /* Stack elements vertically */
        gap: 1.5rem; /* Space between form groups */
      }

      /* Apply this class to a div wrapping each label and input/select */
      .form-group {
        display: flex;
        flex-direction: column; /* Stack label above input */
      }

      /* --- LABELS --- */
      label {
        margin-bottom: 0.5rem; /* Space below label */
        font-weight: 600; /* Semi-bold label text */
        color: #607d8b; /* Muted text color */
        font-size: 0.9rem;
        display: block; /* Ensure label takes full width */
      }

      /* --- INPUTS & SELECTS --- */
      input[type='text'],
      input[type='email'],
      input[type='number'],
      select {
        padding: 0.75rem 1.2rem; /* Comfortable padding */
        border: 1px solid #c0ccda; /* Softer border color */
        border-radius: 6px; /* Slightly more rounded */
        font-size: 1rem;
        color: #344767; /* Main text color */
        background-color: #fff; /* White background */
        transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out; /* Smooth transitions */
        width: 100%; /* Make inputs full width of parent (.form-group) */
        box-sizing: border-box; /* Include padding and border in element's total width */
      }

      /* Custom SVG arrow for select */
      select {
        appearance: none; /* Remove default system arrow */
        background-image: url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3e%3cpath fill=%27none%27 stroke=%27%23607d8b%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m2 5 6 6 6-6%27/%3e%3c/svg%3e');
        background-repeat: no-repeat;
        background-position: right 1rem center;
        background-size: 12px;
        padding-right: 2.5rem; /* Ensure space for the custom arrow */
      }

      input:focus,
      select:focus {
        /* Focus styling */
        border-color: #4a5a8d; /* Primary color on focus */
        outline: 0; /* Remove default outline */
        box-shadow: 0 0 0 0.2rem rgba(74, 90, 141, 0.25); /* Subtle glow */
      }

      input:disabled,
      select:disabled {
        /* Disabled state styling */
        background-color: #e9ecef; /* Light grey background */
        cursor: not-allowed; /* Indicate it's not interactive */
        opacity: 0.8; /* Slightly faded */
      }

      /* --- BUTTONS & LINKS --- */
      /* Reuse button base styles */
      .btn {
        padding: 0.75rem 1.5rem; /* Comfortable padding */
        border: none;
        border-radius: 6px; /* Slightly more rounded */
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500; /* Medium weight */
        transition: background-color 0.2s ease-in-out, opacity 0.2s ease-in-out; /* Smooth transition */
        text-decoration: none;
        display: inline-flex; /* Use flex for alignment (e.g., text + icon) */
        align-items: center;
        justify-content: center;
        gap: 0.4rem; /* Space between text and icon */
      }

      /* Apply this class for the primary action button */
      .btn-primary {
        background-color: #4a5a8d; /* Primary blue */
        color: #fff; /* White text */
      }

      .btn-primary:hover:not(:disabled) {
        background-color: #3a4a7d; /* Darker blue on hover */
      }

      /* Apply .btn-link class for styling an anchor tag like a button (used for Cancel) */
      .btn-link {
        background: none;
        color: #4a5a8d; /* Use the primary title blue */
        padding: 0.75rem 1.5rem; /* Add padding to make it a clickable area similar to the button */
        border: none;
        border-radius: 6px;
        text-align: center;
        /* Remove margin-left here, handled by actions flexbox gap */
      }

      .btn-link:hover {
        text-decoration: underline;
      }

      /* Styling for the disabled button state */
      button:disabled {
        background: #c0ccda; /* Lighter grey */
        color: #808080; /* Grey text */
        cursor: not-allowed;
        opacity: 0.7;
        box-shadow: none;
      }

      /* --- ACTIONS CONTAINER --- */
      /* Style for the div with class="actions" */
      .actions {
        margin-top: 2rem; /* Add space above action buttons */
        display: flex; /* Use flexbox */
        gap: 1rem; /* Space between buttons/links */
        align-items: center; /* Vertically align items */
      }

      /* --- LOADING & ERROR ALERTS --- */
      /* Apply .alert and .alert-info or .alert-danger to your message divs/paragraphs */
      .alert {
        padding: 1.2rem 1.5rem; /* Spacious padding */
        margin-bottom: 2rem; /* Space below the alert */
        border: 1px solid transparent;
        border-radius: 6px; /* Matching radius */
        font-size: 1rem;
        text-align: center;
        display: flex; /* Layout icon and text */
        align-items: center;
        justify-content: center;
        gap: 0.8rem; /* Space between icon/spinner and text */
      }

      .alert-info {
        color: #0277bd; /* Darker blue text */
        background-color: #b3e5fc; /* Lighter blue background */
        border-color: #81d4fa; /* Matching border color */
      }

      .alert-danger {
        color: #c62828; /* Darker red text */
        background-color: #ffcdd2; /* Lighter red background */
        border-color: #ef9a9a; /* Matching border color */
      }

      /* Apply .spinner class for a loading indicator (used inside .alert-info) */
      .spinner {
        border: 4px solid rgba(255, 255, 255, 0.3); /* Light border */
        border-top: 4px solid currentColor; /* Border in the text color */
        border-radius: 50%;
        width: 24px;
        height: 24px;
        animation: spin 1s linear infinite; /* Rotation animation */
        display: inline-block; /* Ensures space */
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      /* Apply .icon-warning class for an error icon (used inside .alert-danger) */
      .icon-warning {
        font-size: 1.4rem;
        font-weight: bold;
      }

      /* --- VALIDATION ERRORS --- */
      /* Apply this class to divs/spans showing validation errors */
      .validation-error {
        color: #dc3545; /* Danger red color */
        font-size: 0.85rem; /* Smaller text */
        margin-top: 0.3rem; /* Space above message */
        /* Remove the previous .error style that applied to input */
        /* input.error { border: 1px solid red; } is no longer needed */
      }

      /* Remove old .error style for color */
      /* .error { color: red; } is no longer needed, replaced by .alert-danger and .validation-error */

      /* Remove old cancel margin */
      /* .cancel { margin-left: 1rem; } is no longer needed, replaced by actions flexbox gap */
    `,
  ],
})
export class UserEditComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  userService = inject(UserService);
  authService = inject(AuthService);
  user?: User; // Keep existing user property

  form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    // The initial 'student' value might override the patched user.role.
    // Consider using null or '' initially and relying solely on patchValue.
    role: new FormControl('' as 'student' | 'teacher' | 'admin', [
      Validators.required,
    ]), // Validators.required might be too strict if not admin? Check logic.
    branch_id: new FormControl<number | null>(null),
  });

  ngOnInit() {
    const userId = Number(this.route.snapshot.paramMap.get('id'));
    // Added basic NaN check and redirect here
    if (isNaN(userId)) {
      console.error('Invalid User ID from route.');
      this.router.navigate(['/admin/users']); // Redirect if ID is invalid
      return; // Stop execution
    }

    // Subscribe to user data and patch form
    this.userService.getUser(userId).subscribe({
      next: (user) => {
        this.user = user; // Store the fetched user
        this.form.patchValue({
          name: user.name,
          email: user.email,
          // Patch role and branch_id regardless of admin status
          // The form control's enabled/disabled state handles user interaction
          role: user.role,
          branch_id: user.branch_id ?? null,
        });
        this.form.markAsPristine(); // Mark as pristine after initial load

        // Disable role and branch_id controls if the current user is not an admin
        if (!this.authService.hasRole('admin')) {
          this.form.controls.role.disable();
          this.form.controls.branch_id.disable();
        }
      },
      error: (err) => {
        console.error('Failed to load user for editing:', err);
        alert(
          'Failed to load user for editing: ' +
            (err.message || 'An unknown error occurred.')
        );
        this.router.navigate(['/admin/users']); // Redirect on load error
      },
    });

    // Optional: React to form value changes if needed, but patchValue handles initial setup
  }

  onSubmit() {
    this.form.markAllAsTouched(); // Mark controls touched to show validation messages

    // Use getRawValue() to get values from potentially disabled controls (if admin)
    const formValues = this.form.getRawValue();

    if (this.form.valid && this.user && !this.userService.loading()) {
      // Check validity, user exists, and not already saving
      const updates: UserUpdateDto = {
        name: formValues.name!, // Use formValues
        email: formValues.email!, // Use formValues
        // Only include role and branch_id if admin AND controls are enabled (matching the ngIf logic)
        // Or include if admin based on role access check, regardless of disabled status on form
        ...(this.authService.hasRole('admin') && {
          // These values come from getRawValue, even if controls were initially disabled
          role: formValues.role as 'admin' | 'student' | 'teacher',
          branch_id: formValues.branch_id ?? undefined, // undefined is generally better for omitting in JSON
        }),
      };

      // Check if the form is dirty before submitting, to prevent unnecessary API calls
      if (!this.form.dirty) {
        alert('No changes to save.');
        return;
      }

      this.userService.updateUser(this.user.id, updates).subscribe({
        next: () => {
          console.log('User updated successfully');
          alert('User updated successfully!');
          // Navigate back or handle success
          this.router.navigate(['/admin/users']);
        },
        error: (err) => {
          console.error('Update failed:', err);
          alert(
            'Update failed: ' +
              (err.error?.message ||
                err.message ||
                'An unknown error occurred.')
          ); // Use err.error for backend messages
        },
      });
    } else if (this.form.invalid) {
      alert('Please fix validation errors before submitting.');
    }
    // No need for else if (!this.user), the ngIf handles that state visually
  }

  // Helper getter to check if saving is in progress (optional)
  get isSaving() {
    return this.userService.loading(); // Assuming userService might expose a loading state for mutations too
  }
}
