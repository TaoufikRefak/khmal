import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  selector: 'app-register',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" #registerForm>
      <h2>Create Your Account!</h2>

      @if (form.errors?.['registrationFailed']) {
      <p class="form-error">{{ form.errors?.['registrationFailed'] }}</p>
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
        @if (form.controls.email.touched) { @if
        (form.controls.email.errors?.['required']) {
        <p class="error">Email is required</p>
        } @if (form.controls.email.errors?.['email']) {
        <p class="error">Please enter a valid email address</p>
        } }
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
          autocomplete="new-password"
        />
        @if (form.controls.password.touched) { @if
        (form.controls.password.errors?.['required']) {
        <p class="error">Password is required</p>
        } @if (form.controls.password.errors?.['minlength']) {
        <p class="error">Password must be at least 6 characters</p>
        } }
      </div>

      <div class="form-group">
        <label for="role">Role</label>
        <select
          id="role"
          formControlName="role"
          [class.invalid]="
            form.controls.role.invalid && form.controls.role.touched
          "
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        @if (form.controls.role.touched &&
        form.controls.role.errors?.['required']) {
        <p class="error">Role is required</p>
        }
      </div>

      @if (requiresBranch) {
      <div class="form-group">
        <label for="branch_id">Branch ID</label>
        <input
          id="branch_id"
          type="number"
          formControlName="branch_id"
          [class.invalid]="
            form.controls.branch_id.invalid && form.controls.branch_id.touched
          "
        />
        @if (form.controls.branch_id.touched &&
        form.controls.branch_id.errors?.['required']) {
        <p class="error">Branch ID is required</p>
        }
      </div>
      }

      <button
        type="submit"
        class="btn btn-primary btn-full-width"
        [disabled]="form.invalid || isRegistering"
      >
        {{ isRegistering ? 'Registering...' : 'Register' }}
      </button>

      <a routerLink="/v1/auth/login" class="login-link"
        >Already have an account? Login</a
      >
    </form>
  `,
  styles: [
    `
      /* Import a nice font - Poppins from Google Fonts */
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      :host {
        font-family: 'Poppins', sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: #f2e8cf; /* Very Light Yellow/Beige */
        padding: 2rem;
        box-sizing: border-box;
        color: #386641; /* Dark Green */
      }

      form {
        width: 100%;
        max-width: 450px;
        padding: 3rem;
        background-color: #ffffff; /* White */
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(56, 102, 65, 0.15); /* Stronger, themed shadow */
        color: #386641; /* Default text color */
        box-sizing: border-box;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        transition: opacity 0.8s ease-out, transform 0.8s ease-out,
          box-shadow 0.8s ease-out; /* Base transition for animations */
      }

      h2 {
        text-align: center;
        color: #386641; /* Dark Green */
        margin-top: 0;
        margin-bottom: 1.5rem;
        font-size: 2.2rem;
        font-weight: 700;
        line-height: 1.2;
      }

      .form-error {
        color: #bc4749; /* Red */
        background: rgba(188, 71, 73, 0.1); /* Light red tint */
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        margin-top: 0;
        font-weight: 500;
        font-size: 0.95rem;
        text-align: center;
        border: 1px solid rgba(188, 71, 73, 0.3);
      }

      .form-group {
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      label {
        font-weight: 600;
        color: #386641; /* Dark Green */
        font-size: 1rem;
        display: block;
        margin-bottom: 0;
      }

      input[type='email'],
      input[type='password'],
      input[type='number'],
      select {
        width: 100%;
        padding: 0.9rem 1.2rem;
        border: 1px solid rgba(56, 102, 65, 0.3); /* Subtle green border */
        border-radius: 8px;
        font-size: 1rem;
        line-height: 1.5;
        box-sizing: border-box;
        transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        color: #386641; /* Dark Green */
        background-color: #ffffff; /* White */
      }

      input::placeholder {
        color: rgba(56, 102, 65, 0.5); /* Muted dark green */
      }

      select {
        appearance: none;
        background-image: url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3e%3cpath fill=%27none%27 stroke=%27%23386641%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m2 5 6 6 6-6%27/%3e%3c/svg%3e'); /* Dark Green arrow */
        background-repeat: no-repeat;
        background-position: right 1rem center;
        background-size: 12px;
        padding-right: 2.5rem;
      }

      input:focus,
      select:focus {
        outline: none;
        border-color: #386641; /* Dark Green */
        box-shadow: 0 0 0 0.2rem rgba(56, 102, 65, 0.2); /* Subtle green shadow */
      }

      input.invalid,
      select.invalid {
        border-color: #bc4749; /* Red */
        background: rgba(188, 71, 73, 0.05); /* Very light red tint */
        box-shadow: 0 0 0 0.2rem rgba(188, 71, 73, 0.1);
      }

      .error {
        color: #bc4749; /* Red */
        font-size: 0.85rem;
        margin-top: 0.3rem;
        display: block;
        text-align: left;
        font-weight: 500;
      }

      button[type='submit'] {
        display: block;
        width: 100%;
        padding: 1rem 2rem;
        background-color: #386641; /* Dark Green */
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s ease-in-out,
          transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        margin-top: 1.5rem;
        box-shadow: 0 4px 15px rgba(56, 102, 65, 0.3); /* Subtle green shadow */
      }

      button[type='submit']:hover:not(:disabled) {
        background-color: #2b4c31; /* Darker green on hover */
        box-shadow: 0 6px 20px rgba(56, 102, 65, 0.4); /* Slightly larger shadow on hover */
      }

      button[type='submit']:active:not(:disabled) {
        transform: translateY(1px); /* Slight press effect */
        box-shadow: 0 2px 8px rgba(56, 102, 65, 0.4); /* Adjusted shadow on active */
      }

      button[type='submit']:disabled {
        background-color: rgba(56, 102, 65, 0.3); /* Muted green tint */
        color: rgba(255, 255, 255, 0.6); /* Muted white text */
        cursor: not-allowed;
        opacity: 0.9;
        box-shadow: none;
        transform: none;
      }

      .login-link {
        display: block;
        text-align: center;
        margin-top: 2rem;
        color: #6a994e; /* Medium Green */
        text-decoration: none;
        font-size: 1rem;
        font-weight: 600;
        transition: color 0.2s ease-in-out, text-decoration 0.2s ease-in-out;
      }

      .login-link:hover {
        color: #386641; /* Dark Green */
        text-decoration: underline;
      }

      /* --- ANIMATIONS --- */

      form.processing {
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

      form.success {
        animation: registration-success 0.8s ease-out forwards;
      }

      @keyframes registration-success {
        0% {
          transform: scale(1) translateY(0);
          opacity: 1;
          box-shadow: 0 10px 30px rgba(56, 102, 65, 0.15);
        }
        50% {
          transform: scale(1.05) translateY(-20px); /* Scale up slightly and move up */
          box-shadow: 0 10px 50px rgba(167, 201, 87, 0.6); /* Use Light Green/Yellow for highlight */
          opacity: 1;
        }
        100% {
          transform: scale(0.8) translateY(-50px); /* Scale down and move further up */
          opacity: 0; /* Fade out */
          box-shadow: 0 10px 60px rgba(167, 201, 87, 0); /* Fade out shadow */
        }
      }

      form.error-shake {
        animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        transform: translate3d(0, 0, 0);
        perspective: 1000px;
      }

      @keyframes shake {
        10%,
        90% {
          transform: translate3d(-2px, 0, 0);
        }
        20%,
        80% {
          transform: translate3d(4px, 0, 0);
        }
        30%,
        50%,
        70% {
          transform: translate3d(-4px, 0, 0);
        }
        40%,
        60% {
          transform: translate3d(4px, 0, 0);
        }
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
        input[type='email'],
        input[type='password'],
        input[type='number'],
        select {
          padding: 0.8rem 1rem;
          font-size: 0.95rem;
          border-radius: 6px;
          border-width: 1px;
        }
        select {
          padding-right: 20px;
          background-position: right 0.8rem center;
          background-size: 10px;
        }
        input:focus,
        select:focus {
          box-shadow: 0 0 0 0.15rem rgba(56, 102, 65, 0.15);
        }
        input.invalid,
        select.invalid {
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

        .login-link {
          margin-top: 1.5rem;
          font-size: 0.95rem;
          font-weight: 500;
        }
      }
    `,
  ],
})
export class RegisterComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('registerForm') registerFormElement!: ElementRef<HTMLFormElement>;

  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    role: new FormControl('student', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    branch_id: new FormControl<number | null>(null),
  });

  isRegistering = false;

  get requiresBranch() {
    const role = this.form.controls.role.value;
    return ['student', 'teacher'].includes(role);
  }

  ngOnInit() {
    // Add validator to branch_id initially if role is 'student' or 'teacher'
    if (this.form.controls.branch_id && this.requiresBranch) {
      this.form.controls.branch_id.addValidators(Validators.required);
      this.form.controls.branch_id.updateValueAndValidity();
    }

    // Subscribe to value changes to dynamically update validators
    this.form.controls.role.valueChanges.subscribe((role) => {
      const branchIdControl = this.form.controls.branch_id;
      if (!branchIdControl) return;

      if (['student', 'teacher'].includes(role)) {
        if (!branchIdControl.hasValidator(Validators.required)) {
          branchIdControl.addValidators(Validators.required);
        }
      } else {
        branchIdControl.clearValidators();
        branchIdControl.patchValue(null);
      }
      branchIdControl.updateValueAndValidity();
      console.log(`Role changed to ${role}, branch_id validators updated.`);
    });
  }

  onSubmit() {
    this.form.markAllAsTouched();
    this.form.setErrors(null);

    this.registerFormElement.nativeElement.classList.remove(
      'processing',
      'success',
      'error-shake'
    );

    if (this.form.valid && !this.isRegistering) {
      this.isRegistering = true;
      this.registerFormElement.nativeElement.classList.add('processing');

      console.log('Form is valid, attempting registration...');
      const formData = this.form.getRawValue();

      const registrationData: any = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      if (
        this.requiresBranch &&
        formData.branch_id !== null &&
        formData.branch_id !== undefined
      ) {
        registrationData.branch_id = formData.branch_id;
      }

      this.authService.register(registrationData).subscribe({
        next: () => {
          console.log('Registration successful, navigating to login...');
          this.registerFormElement.nativeElement.classList.remove('processing');
          this.registerFormElement.nativeElement.classList.add('success');

          setTimeout(() => {
            this.router.navigate(['/v1/auth/login']);
          }, 800);

          this.isRegistering = false;
        },
        error: (err) => {
          console.error('Registration failed (error callback reached):', err);
          this.registerFormElement.nativeElement.classList.remove('processing');
          this.registerFormElement.nativeElement.classList.add('error-shake');

          const errorMessage =
            err?.error?.message || 'Registration failed. Please try again.';
          this.form.setErrors({ registrationFailed: errorMessage });

          this.isRegistering = false;

          setTimeout(() => {
            this.registerFormElement.nativeElement.classList.remove(
              'error-shake'
            );
          }, 500);
        },
      });
    } else if (this.form.invalid && !this.isRegistering) {
      this.registerFormElement.nativeElement.classList.add('error-shake');
      setTimeout(() => {
        this.registerFormElement.nativeElement.classList.remove('error-shake');
      }, 500);
    }
  }
}
