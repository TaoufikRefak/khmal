// reset-password.component.ts
import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../services/auth.service'; // Assuming this path is correct
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIf, CommonModule } from '@angular/common';
import { catchError } from 'rxjs/operators'; // Import catchError for better error handling
import { of } from 'rxjs'; // Import 'of' to return an observable on error

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  selector: 'app-reset-password',
  template: `
    <style>
      /* Import a nice font - Poppins from Google Fonts */
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      :host {
        font-family: 'Poppins', sans-serif;
        display: flex; /* Use flex to center container easily */
        justify-content: center; /* Center horizontally */
        align-items: center; /* Center vertically on the page */
        min-height: 100vh;
        /* Use the very light beige as the background */
        background-color: #f2e8cf;
        padding: 2rem; /* Add some padding */
        box-sizing: border-box; /* Include padding in host size */
        color: #386641; /* Use the dark green for default text */
      }

      form {
        width: 100%; /* Allow form to take more width on smaller screens */
        max-width: 450px; /* Slightly wider than standard forms for prominence */
        /* margin handled by :host flexbox centering */
        padding: 3rem; /* Increased padding inside */
        background-color: #ffffff; /* White background */
        border-radius: 12px; /* More rounded corners for a softer look */
        box-shadow: 0 10px 30px rgba(56, 102, 65, 0.15); /* Stronger, themed shadow */
        color: #386641; /* Default text color */
        box-sizing: border-box; /* Include padding in width */
        text-align: center; /* Center contents like the heading */
        display: flex; /* Make form a flex container */
        flex-direction: column; /* Stack contents vertically */
        gap: 1.5rem; /* Space between form groups and elements */

        /* Add base transition for success animation properties */
        transition: opacity 0.8s ease-out, transform 0.8s ease-out,
          box-shadow 0.8s ease-out;
      }

      h2 {
        text-align: center;
        color: #386641; /* Dark Green */
        margin-top: 0;
        margin-bottom: 1.5rem; /* Space below the heading */
        font-size: 2.2rem; /* Larger heading */
        font-weight: 700; /* Bolder */
        line-height: 1.2;
      }

      /* Style for the general form error */
      .form-error,
      .success-message,
      .error-message {
        /* Common styles for message blocks */
        padding: 1rem; /* Comfortable padding */
        border-radius: 8px; /* Rounded corners */
        margin-bottom: 1.5rem; /* Space below the message before inputs */
        margin-top: 0; /* Remove default margin if any */
        font-weight: 500; /* Medium weight */
        font-size: 0.95rem; /* Slightly smaller */
        text-align: center; /* Center the message */
      }

      .form-error,
      .error-message {
        color: #bc4749; /* Red */
        background: rgba(188, 71, 73, 0.1); /* Light red tint background */
        border: 1px solid rgba(188, 71, 73, 0.3); /* Matching border */
      }

      .success-message {
        color: #386641; /* Dark Green */
        background: rgba(106, 153, 78, 0.1); /* Light medium green tint */
        border: 1px solid rgba(106, 153, 78, 0.3); /* Matching border */
      }

      /* Style for each form field container (div) */
      .form-group {
        text-align: left; /* Align text inside form groups to the left */
        /* Gap handled by form flexbox */
        display: flex; /* Use flex for label/input */
        flex-direction: column; /* Stack label above input */
        gap: 0.5rem; /* Space between label and input */
      }

      /* Label styling */
      label {
        font-weight: 600; /* Semi-bold label text */
        color: #386641; /* Dark Green for labels */
        font-size: 1rem; /* Standard font size */
        display: block; /* Ensure label takes full width */
        margin-bottom: 0; /* Gap handled by form-group flexbox */
      }

      /* Input styling */
      input {
        width: 100%;
        padding: 0.9rem 1.2rem; /* More padding inside inputs */
        border: 1px solid rgba(56, 102, 65, 0.3); /* Subtle green border */
        border-radius: 8px; /* Rounded corners for inputs */
        font-size: 1rem; /* Standard font size */
        line-height: 1.5;
        box-sizing: border-box;
        transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        color: #386641; /* Dark Green text color */
        background-color: #ffffff; /* White background */
      }
      /* Placeholder style */
      input::placeholder {
        color: rgba(56, 102, 65, 0.5); /* Muted dark green placeholder */
      }

      /* Input focus state */
      input:focus {
        outline: none;
        border-color: #386641; /* Dark Green for focus */
        box-shadow: 0 0 0 0.2rem rgba(56, 102, 65, 0.2); /* Subtle green shadow on focus */
      }

      /* Invalid input state */
      input.invalid {
        border-color: #bc4749; /* Red for invalid */
        background: rgba(188, 71, 73, 0.05); /* Very light red tint */
        box-shadow: 0 0 0 0.2rem rgba(188, 71, 73, 0.1);
      }

      /* Error message styling for individual fields */
      .error {
        color: #bc4749; /* Red for error messages */
        font-size: 0.85rem; /* Smaller font size */
        margin-top: 0.3rem; /* Space above the error message */
        /* margin-bottom: 0; - handled by form-group gap */
        display: block;
        text-align: left; /* Ensure field errors align left */
        font-weight: 500;
      }

      /* Submit button styling */
      button[type='submit'] {
        display: block;
        width: 100%;
        padding: 1rem 2rem; /* More padding */
        background-color: #386641; /* Dark Green background */
        color: white;
        border: none;
        border-radius: 8px; /* Rounded corners */
        font-size: 1.1rem; /* Larger font */
        font-weight: 600; /* Bolder text */
        cursor: pointer;
        transition: background-color 0.2s ease-in-out,
          transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        margin-top: 1.5rem; /* Space above the button */
        box-shadow: 0 4px 15px rgba(56, 102, 65, 0.3); /* Subtle green shadow */
      }

      /* Button hover state */
      button[type='submit']:hover:not(:disabled) {
        background-color: #2b4c31; /* Darker green on hover */
        box-shadow: 0 6px 20px rgba(56, 102, 65, 0.4); /* Slightly larger shadow on hover */
      }

      /* Button active state (press down) */
      button[type='submit']:active:not(:disabled) {
        transform: translateY(1px); /* Slight press effect */
        box-shadow: 0 2px 8px rgba(56, 102, 65, 0.4); /* Adjusted shadow on active */
      }

      /* Button disabled state (when isLoggingIn is true) */
      button[type='submit']:disabled {
        background-color: rgba(56, 102, 65, 0.3); /* Muted green tint */
        color: rgba(255, 255, 255, 0.6); /* Muted white text */
        cursor: not-allowed;
        opacity: 0.9; /* Keep it somewhat visible */
        box-shadow: none; /* Remove shadow when disabled */
        transform: none; /* No animation when disabled */
      }

      /* --- ANIMATIONS --- */

      /* Animation for form when submitting is in progress */
      form.processing {
        /* Subtle pulsing shadow */
        animation: processing-pulse 1.5s infinite ease-in-out;
      }

      @keyframes processing-pulse {
        0% {
          box-shadow: 0 10px 30px rgba(56, 102, 65, 0.15);
        }
        50% {
          box-shadow: 0 10px 40px rgba(106, 153, 78, 0.4);
        } /* Use Medium Green for highlight */
        100% {
          box-shadow: 0 10px 30px rgba(56, 102, 65, 0.15);
        }
      }

      /* Animation for form on failure (shake) */
      form.error-shake {
        animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; /* both keeps the final state */
        transform: translate3d(0, 0, 0); /* Hardware accelerate */
        perspective: 1000px; /* Helps with 3d transform */
      }

      @keyframes shake {
        10%,
        90% {
          transform: translate3d(-2px, 0, 0);
        } /* Shift left */
        20%,
        80% {
          transform: translate3d(4px, 0, 0);
        } /* Shift right */
        30%,
        50%,
        70% {
          transform: translate3d(-4px, 0, 0);
        } /* Shift left */
        40%,
        60% {
          transform: translate3d(4px, 0, 0);
        } /* Shift right */
      }

      /* --- Responsive adjustments --- */
      @media (max-width: 500px) {
        :host {
          padding: 1rem;
        }
        form {
          padding: 2rem 1.5rem;
          border-radius: 10px;
          gap: 1.2rem;
        }
        h2 {
          font-size: 2rem;
          margin-bottom: 1.2rem;
        }
        .form-error,
        .success-message,
        .error-message {
          padding: 0.8rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          border-radius: 6px;
          border-width: 1px;
        }
        .form-group {
          gap: 0.4rem;
        }
        label {
          font-size: 0.9rem;
        }
        input {
          padding: 0.8rem 1rem;
          font-size: 0.95rem;
          border-radius: 6px;
          border-width: 1px;
        }
        input:focus {
          box-shadow: 0 0 0 0.15rem rgba(56, 102, 65, 0.15);
        }
        input.invalid {
          box-shadow: 0 0 0 0.15rem rgba(188, 71, 73, 0.08);
          border-width: 1px;
        }
        .error {
          font-size: 0.8rem;
          margin-top: 0.2rem;
          font-weight: normal;
        }
        button[type='submit'] {
          padding: 0.9rem 1.5rem;
          font-size: 1rem;
          border-radius: 6px;
          margin-top: 1.5rem;
        }
        button[type='submit']:hover:not(:disabled) {
          box-shadow: 0 4px 15px rgba(56, 102, 65, 0.35);
        }
        button[type='submit']:active:not(:disabled) {
          box-shadow: 1px 6px rgba(56, 102, 65, 0.35); /* Corrected typo, removed 0 */
        }
      }
    </style>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" #resetFormElement>
      <h2>Reset Your Password</h2>

      <!-- Success message -->
      @if (successMessage) {
      <div class="success-message">
        {{ successMessage }}
      </div>
      }
      <!-- Form-level error (e.g., expired token, backend issue) -->
      @if (form.errors?.['resetFailed']) {
      <p class="form-error">{{ form.errors?.['resetFailed'] }}</p>
      }
      <!-- Error message for initial token check -->
      @if (invalidToken && !form.errors?.['resetFailed']) {
      <div class="error-message">
        Invalid or expired reset token. Please request a new reset link.
      </div>
      } @if (!successMessage && !invalidToken) {
      <!-- Hide form elements if success or critical invalid token error -->
      <div class="form-group">
        <label for="newPassword">New Password</label>
        <input
          id="newPassword"
          type="password"
          formControlName="newPassword"
          [class.invalid]="
            form.controls.newPassword.invalid &&
            form.controls.newPassword.touched
          "
          autocomplete="new-password"
        />
        @if (form.controls.newPassword.touched &&
        form.controls.newPassword.errors?.['required']) {
        <p class="error">Password is required</p>
        } @if (form.controls.newPassword.touched &&
        form.controls.newPassword.errors?.['minlength']) {
        <p class="error">Password must be at least 6 characters</p>
        }
      </div>

      <button
        type="submit"
        class="btn btn-primary btn-full-width"
        [disabled]="form.invalid || isSubmitting"
      >
        {{ isSubmitting ? 'Resetting...' : 'Reset Password' }}
      </button>
      }
    </form>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Renamed to match template variable
  @ViewChild('resetFormElement') resetFormElement!: ElementRef<HTMLFormElement>;

  form = new FormGroup({
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  isSubmitting = false;
  successMessage = '';
  invalidToken = false; // Use this flag for the initial token check error
  token = '';

  ngOnInit() {
    this.route.queryParams.subscribe((params: { [x: string]: string }) => {
      this.token = params['token'] || '';

      if (!this.token) {
        this.invalidToken = true; // Set flag for template message
        // Optionally navigate, but maybe showing the message is enough?
        // The template now displays the error message based on this flag.
        // If you still want to redirect, uncomment the line below.
        // setTimeout(() => this.router.navigate(['/auth/forgot-password']), 3000); // Redirect after delay?
      }
    });
  }

  onSubmit(): void {
    // Clear previous errors and mark fields
    this.form.markAllAsTouched();
    this.form.setErrors(null); // Clear form-level errors

    // Remove previous animation classes
    this.resetFormElement?.nativeElement?.classList.remove(
      'processing',
      'error-shake'
    );

    // Do not proceed if the form is invalid or already submitting, or if token is missing
    if (this.form.invalid || this.isSubmitting || !this.token) {
      if (this.form.invalid && !this.isSubmitting) {
        // Trigger shake animation if form is invalid on button click
        this.resetFormElement?.nativeElement?.classList.add('error-shake');
        setTimeout(() => {
          this.resetFormElement?.nativeElement?.classList.remove('error-shake');
        }, 500); // Match shake animation duration
      }
      // If token is missing, invalidToken flag should already be true from ngOnInit
      return;
    }

    this.isSubmitting = true;
    // Add processing class for animation
    this.resetFormElement?.nativeElement?.classList.add('processing');

    const newPassword = this.form.value.newPassword!;

    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: () => {
        console.log('Password reset successful');
        this.isSubmitting = false;
        this.resetFormElement?.nativeElement?.classList.remove('processing');
        // Don't add a success class animation on the form itself, just show message
        this.successMessage =
          'Password reset successfully! Redirecting to login...';

        // Redirect after showing the success message
        setTimeout(() => this.router.navigate(['/v1/auth/login']), 2000);
      },
      error: (err: any) => {
        // Use 'any' for now or define a specific error type
        console.error('Reset password failed', err);
        this.isSubmitting = false;
        this.resetFormElement?.nativeElement?.classList.remove('processing');

        // Add error class for shake animation
        this.resetFormElement?.nativeElement?.classList.add('error-shake');
        setTimeout(() => {
          this.resetFormElement?.nativeElement?.classList.remove('error-shake');
        }, 500); // Match shake animation duration

        // Handle specific error messages
        if (err.status === 0) {
          this.form.setErrors({
            resetFailed: 'Connection error. Please check your internet.',
          });
        } else if (err.status === 400) {
          // If it's a 400 from the backend, it might mean the token is invalid/expired
          this.invalidToken = true; // Set the flag which displays the specific message
          // You might also want a general form error message if needed,
          // but displaying the invalidToken message is clearer here.
          // this.form.setErrors({ resetFailed: err.error?.message || 'Invalid or expired token' });
        } else {
          this.form.setErrors({
            resetFailed:
              err.error?.message || 'An error occurred during password reset.',
          });
        }
      },
    });
  }
}
