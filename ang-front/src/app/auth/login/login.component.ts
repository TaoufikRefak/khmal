import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { NgIf, CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  selector: 'app-login',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" #loginForm>
      <h2>Welcome Back!</h2>

      @if (form.errors?.['loginFailed']) {
      <p class="form-error">{{ form.errors?.['loginFailed'] }}</p>
      }

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          formControlName="email"
          [class.invalid]="
            form.controls.email.invalid && form.controls.email.touched
          "
          autocomplete="email"
        />
        @if (form.controls.email.touched &&
        form.controls.email.errors?.['required']) {
        <p class="error">Email is required</p>
        } @if (form.controls.email.touched &&
        form.controls.email.errors?.['email']) {
        <p class="error">Please enter a valid email address</p>
        }
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          formControlName="password"
          [class.invalid]="
            form.controls.password.invalid && form.controls.password.touched
          "
          autocomplete="current-password"
        />
        @if (form.controls.password.touched &&
        form.controls.password.errors?.['required']) {
        <p class="error">Password is required</p>
        }
      </div>

      <button
        type="submit"
        class="btn btn-primary btn-full-width"
        [disabled]="form.invalid || isLoggingIn"
      >
        {{ isLoggingIn ? 'Logging In...' : 'Login' }}
      </button>

      <div class="password-actions">
        <a routerLink="/v1/auth/forgot-password" class="forgot-password-link">
          Forgot Password?
        </a>
      </div>

      <a routerLink="/v1/auth/register" class="create-account-link">
        Create account
      </a>
    </form>
  `,
  styles: [
    `
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
        text-align: center; /* Center contents like the heading and link */
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
      .password-actions {
        margin-top: 1rem;
        text-align: center;
      }

      .forgot-password-link {
        color: #6a994e;
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.2s ease;
      }

      .forgot-password-link:hover {
        color: #386641;
        text-decoration: underline;
      }

      @media (max-width: 500px) {
        .forgot-password-link {
          font-size: 0.85rem;
        }
      }
      /* Style for the general login error */
      .form-error {
        /* Your template uses this class */
        color: #bc4749; /* Red */
        background: rgba(188, 71, 73, 0.1); /* Light red tint background */
        padding: 1rem; /* Comfortable padding */
        border-radius: 8px; /* Rounded corners */
        margin-bottom: 1.5rem; /* Space below the message before inputs */
        margin-top: 0; /* Remove default margin if any */
        font-weight: 500; /* Medium weight */
        font-size: 0.95rem; /* Slightly smaller */
        text-align: center; /* Center the message */
        border: 1px solid rgba(188, 71, 73, 0.3); /* Matching border */
      }

      /* Style for each form field container (div) */
      .form-group {
        /* Your template uses this class */
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
        /* Your template uses this class */
        border-color: #bc4749; /* Red for invalid */
        background: rgba(188, 71, 73, 0.05); /* Very light red tint */
        box-shadow: 0 0 0 0.2rem rgba(188, 71, 73, 0.1);
      }

      /* Error message styling for individual fields */
      .error {
        /* Your template uses this class */
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

        /* Optional: Add a simple pulse or indicator for the button itself */
        /* animation: pulse-button 1s infinite ease-in-out; */
      }

      /* Register link styling */
      .create-account-link {
        /* Your template uses this class */
        display: block;
        text-align: center;
        margin-top: 2rem; /* Space above the link */
        color: #6a994e; /* Medium Green for the link */
        text-decoration: none; /* No default underline */
        font-size: 1rem;
        font-weight: 600; /* Semi-bold */
        transition: color 0.2s ease-in-out, text-decoration 0.2s ease-in-out;
      }

      /* Register link hover state */
      .create-account-link:hover {
        color: #386641; /* Dark Green on hover */
        text-decoration: underline; /* Add underline on hover */
      }

      /* --- ANIMATIONS --- */

      /* Animation for form when login is in progress */
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

      /* Animation for form on successful login (exit animation) */
      form.success {
        animation: login-success 0.8s ease-out forwards; /* forwards keeps the final state */
      }

      @keyframes login-success {
        0% {
          transform: scale(1) translateY(0);
          opacity: 1;
          box-shadow: 0 10px 30px rgba(56, 102, 65, 0.15);
        }
        50% {
          transform: scale(1.05) translateY(-20px); /* Scale up slightly and move up */
          box-shadow: 0 10px 50px rgba(106, 153, 78, 0.6); /* More vibrant shadow */
          opacity: 1;
        }
        100% {
          transform: scale(0.8) translateY(-50px); /* Scale down and move further up */
          opacity: 0; /* Fade out */
          box-shadow: 0 10px 60px rgba(106, 153, 78, 0); /* Fade out shadow */
        }
      }

      /* Animation for form on login failure (shake) */
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

      /* Optional: Pulse animation for the button when disabled (logging in) */
      /* button[type="submit"]:disabled.pulsing {
        animation: pulse-button 1s infinite ease-in-out;
      }
      @keyframes pulse-button {
        0% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.02); opacity: 1; }
        100% { transform: scale(1); opacity: 0.9; }
      } */

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
        .form-error {
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
          box-shadow: 0 1px 6px rgba(56, 102, 65, 0.35);
        }

        .create-account-link {
          margin-top: 1.5rem;
          font-size: 0.95rem;
          font-weight: 500;
        }
      }
    `,
  ],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('loginForm') loginFormElement!: ElementRef<HTMLFormElement>;

  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  isLoggingIn = false; // State to track if login is in progress

  onSubmit(): void {
    // Mark fields as touched
    this.form.markAllAsTouched();
    this.form.setErrors(null); // Clear any previous form errors

    // Remove previous animation classes
    this.loginFormElement.nativeElement.classList.remove(
      'processing',
      'success',
      'error-shake'
    );

    // Only proceed if the form is currently valid and not already logging in
    if (this.form.valid && !this.isLoggingIn) {
      this.isLoggingIn = true; // Set logging in state

      // Add processing class to trigger animation/styling
      this.loginFormElement.nativeElement.classList.add('processing');

      this.authService.login(this.form.getRawValue()).subscribe({
        next: (response: any) => {
          console.log('Login successful', response);

          // Remove processing class
          this.loginFormElement.nativeElement.classList.remove('processing');

          // Add success class to trigger the exit animation
          this.loginFormElement.nativeElement.classList.add('success');

          // Navigate AFTER the success animation finishes
          // Match the duration of the 'login-success' animation in CSS (e.g., 800ms)
          setTimeout(() => {
            this.router.navigate(['/course']); // Navigate on success
          }, 800); // Should be slightly longer than the animation duration

          this.isLoggingIn = false; // Reset state (component will be destroyed soon anyway)
        },
        error: (err: { error: { message: string } }) => {
          console.error('Login failed', err);

          // Remove processing class
          this.loginFormElement.nativeElement.classList.remove('processing');

          // Add error class to trigger the shake animation
          this.loginFormElement.nativeElement.classList.add('error-shake');

          // Display the error message
          const errorMessage =
            err?.error?.message || 'Invalid email or password';
          this.form.setErrors({ loginFailed: errorMessage });

          this.isLoggingIn = false; // Reset logging in state

          // Remove the shake class after the animation finishes
          // Match the duration of the 'shake' animation in CSS (e.g., 500ms)
          setTimeout(() => {
            this.loginFormElement.nativeElement.classList.remove('error-shake');
          }, 500);
        },
      });
    } else if (this.form.invalid && !this.isLoggingIn) {
      // If form is invalid on click and not logging in, trigger shake immediately
      this.loginFormElement.nativeElement.classList.add('error-shake');
      setTimeout(() => {
        this.loginFormElement.nativeElement.classList.remove('error-shake');
      }, 500);
    }
  }
}
