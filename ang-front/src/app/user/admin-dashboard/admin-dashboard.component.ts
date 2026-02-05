import { Component, inject } from '@angular/core';
import { UserService } from '../services/user.service';
import { AuthService } from '../../auth/services/auth.service';
import { NgFor, NgIf, TitleCasePipe, CommonModule } from '@angular/common'; // Add CommonModule
import { RouterLink, Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, TitleCasePipe, CommonModule], // Ensure CommonModule is included
  template: `
    <div class="container">
      <h2 class="dashboard-title">User Dashboard</h2>

      <div class="controls">
        <div class="form-group">
          <label for="roleFilter">Filter by Role:</label>
          <select id="roleFilter" (change)="onRoleFilterChange($event)">
            <option value="">All Roles</option>
            <option *ngFor="let role of roles" [value]="role">
              {{ role | titlecase }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="branchSearch">Go to Branch:</label>
          <!-- === Add this wrapper div === -->
          <div class="input-button-group">
            <input
              type="number"
              id="branchSearch"
              #branchInput
              (keyup.enter)="navigateToBranch(branchInput.value)"
              placeholder="Enter branch ID"
            />
            <button
              class="btn btn-secondary"
              (click)="navigateToBranch(branchInput.value)"
            >
              Go
            </button>
          </div>
          <!-- === End wrapper div === -->
        </div>
        <button class="btn btn-primary" (click)="refreshUsers()">
          Refresh Users
        </button>
      </div>

      <div *ngIf="userService.loading()" class="alert alert-info loading">
        <span class="spinner"></span> Loading users...
      </div>
      <div *ngIf="userService.error()" class="alert alert-danger error">
        <span class="icon-warning">!</span> Error: {{ userService.error() }}
      </div>

      <div
        class="table-container"
        *ngIf="!userService.loading() && !userService.error()"
      >
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Branch</th>
              <th class="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of userService.users()" class="user-row">
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span class="role-badge role-{{ user.role }}">
                  {{ user.role | titlecase }}
                </span>
              </td>
              <td>{{ user.branch_id || '-' }}</td>
              <td class="actions-cell">
                <a
                  [routerLink]="['/user/management/edit/', user.id]"
                  class="btn btn-outline-primary btn-sm"
                  >Edit</a
                >
                <button
                  (click)="deleteUser(user.id)"
                  *ngIf="authService.hasRole('admin')"
                  class="btn btn-danger btn-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
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
        padding: 2rem;
        box-sizing: border-box;
      }

      .container {
        /* Your template uses this class */
        max-width: 1200px;
        margin: 0 auto;
        background-color: #ffffff; /* Keep white for the main container */
        padding: 2.5rem;
        border-radius: 12px; /* More rounded corners */
        box-shadow: 0 10px 30px rgba(56, 102, 65, 0.1); /* Subtle shadow using dark green */
        box-sizing: border-box;
      }

      /* --- TITLE --- */
      /* Apply this class to your h1 or h2 heading */
      .dashboard-title {
        /* Your template uses this class */
        color: #386641; /* Dark Green */
        margin-top: 0;
        margin-bottom: 1.8rem; /* More space below title */
        font-size: 2.4rem; /* Larger title */
        font-weight: 700; /* Bolder */
        border-bottom: 2px solid rgba(56, 102, 65, 0.2); /* Subtle green separator */
        padding-bottom: 1.2rem; /* More padding below title text */
        text-align: left;
        line-height: 1.2;
      }

      /* --- CONTROLS --- */
      /* Div containing filter and refresh */
      .controls {
        /* Your template uses this class */
        display: flex;
        gap: 1.5rem; /* Increased gap */
        margin-bottom: 2.5rem; /* More space below controls */
        align-items: flex-end; /* Align items to the bottom (select vs button) */
        flex-wrap: wrap; /* Allow wrapping on small screens */
      }

      .form-group {
        /* Your template uses this class */
        display: flex;
        flex-direction: column;
        /* Remove margin-bottom if this form-group is inside .controls with gap */
        /* margin-bottom: 0; */
      }

      .form-group label {
        /* Label for the select */
        margin-bottom: 0.5rem; /* Space below label */
        font-weight: 600; /* Semi-bold label */
        color: #386641; /* Dark Green for label */
        font-size: 1rem; /* Standard label size */
      }

      /* Select input styling */
      select {
        padding: 0.8rem 1.2rem; /* More padding */
        border: 1px solid rgba(56, 102, 65, 0.3); /* Subtle green border */
        border-radius: 8px; /* Rounded corners */
        background-color: #ffffff; /* White background */
        font-size: 1rem;
        color: #386641; /* Dark Green text */
        cursor: pointer;
        appearance: none; /* Remove default arrow */
        background-image: url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3e%3cpath fill=%27none%27 stroke=%27%23386641%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m2 5 6 6 6-6%27/%3e%3c/svg%3e'); /* Dark Green arrow */
        background-repeat: no-repeat;
        background-position: right 1rem center;
        background-size: 12px;
        padding-right: 2.5rem; /* Ensure space for the custom arrow */
        transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        box-sizing: border-box; /* Include padding/border in element's size */
      }

      select:focus {
        border-color: #386641; /* Dark Green on focus */
        outline: 0;
        box-shadow: 0 0 0 0.2rem rgba(56, 102, 65, 0.2); /* Subtle green glow */
      }

      /* === NEW STYLES FOR BRANCH INPUT AND GO BUTTON === */

      /* Wrapper for Branch ID input and Go button */
      .input-button-group {
        display: flex; /* Arrange children side-by-side */
        gap: 0.5rem; /* Space between input and button */
        align-items: flex-end; /* Align input and button vertically */
        /* Use width: 100% if the form-group isn't set width, but allow flex-grow */
      }

      .input-button-group input[type='number'] {
        /* Style for the Branch ID input */
        /* Inherit styles from select for consistency */
        padding: 0.8rem 1rem; /* Match select padding */
        border: 1px solid rgba(56, 102, 65, 0.3); /* Match select border */
        border-radius: 8px; /* Match select radius */
        font-size: 1rem; /* Match select font size */
        color: #386641; /* Match select text color */
        box-sizing: border-box;
        /* Give it a specific width that makes sense for an ID */
        width: 120px; /* Fixed width */
        flex-shrink: 0; /* Prevent shrinking */
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      .input-button-group input[type='number']:focus {
        outline: none;
        border-color: #6a994e;
        box-shadow: 0 0 0 0.25rem rgba(106, 153, 78, 0.25);
      }

      .btn-secondary {
        /* Style for the Go button */
        background-color: #6a994e; /* Medium Green */
        color: #fff; /* White text */
        border-color: #6a994e; /* Solid border matching background */
        /* Inherit padding, border-radius, etc. from .btn and .btn-sm if applicable */
        padding: 0.75rem 1.5rem; /* Use standard btn padding */
        border-radius: 8px; /* Use standard btn radius */
        font-size: 1rem; /* Use standard btn font size */
        flex-shrink: 0; /* Prevent shrinking */
        /* Align self to match input height if flex-end on parent isn't enough */
        /* align-self: stretch; */ /* Might stretch button vertically, test this */
      }

      .btn-secondary:hover:not(:disabled) {
        background-color: #557c3e; /* Darker Medium Green */
        border-color: #557c3e;
        transform: translateY(-2px); /* Subtle lift */
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }

      .btn-secondary:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: none;
      }

      /* === END NEW STYLES === */

      /* --- BUTTONS (Existing General Styles) --- */
      .btn {
        /* Your template uses this class */
        padding: 0.75rem 1.5rem; /* Comfortable padding */
        border: 1px solid transparent; /* Default border */
        border-radius: 8px; /* Slightly more rounded */
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600; /* Semi-bold */
        transition: background-color 0.2s ease-in-out,
          border-color 0.2s ease-in-out, color 0.2s ease-in-out,
          opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
        text-decoration: none;
        display: inline-flex; /* Use flex for aligning potential icons later */
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
      }

      .btn-sm {
        /* Smaller buttons for actions in the table */
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
        border-radius: 6px; /* Slightly less rounded for small */
      }

      .btn-primary {
        /* Create User Button */
        background-color: #386641; /* Dark Green */
        color: #fff;
      }

      .btn-primary:hover:not(:disabled) {
        background-color: #2b4c31; /* Darker shade on hover */
        transform: translateY(-2px); /* Subtle lift */
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }
      .btn-primary:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: none;
      }

      .btn-outline-primary {
        /* Edit Button */
        background-color: transparent;
        border: 1px solid #6a994e; /* Medium Green border */
        color: #6a994e; /* Medium Green text */
      }

      .btn-outline-primary:hover:not(:disabled) {
        background-color: #6a994e; /* Fill with color on hover */
        color: #fff; /* White text on hover */
        transform: translateY(-2px); /* Subtle lift */
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }
      .btn-outline-primary:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: none;
      }

      .btn-danger {
        /* Delete Button */
        background-color: #bc4749; /* Red */
        color: #fff;
        border: 1px solid #bc4749;

        &:hover:not(:disabled) {
          background-color: #a43d40; /* Darker red */
          border-color: #a43d40;
          transform: translateY(-2px); /* Subtle lift */
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        &:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: none;
        }
      }

      /* Styling for the disabled button state */
      button:disabled,
      .btn:disabled {
        /* Apply to .btn class too */
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
        padding: 1.5rem; /* Increased padding */
        margin-bottom: 2rem; /* More space below alerts */
        border: 1px solid transparent;
        border-radius: 8px; /* Matching border radius */
        font-size: 1rem;
        text-align: center;
        display: flex; /* Align icon and text */
        align-items: center;
        justify-content: center;
        gap: 0.8rem;
        max-width: 800px; /* Limit alert width */
        margin-left: auto; /* Center alert */
        margin-right: auto; /* Center alert */
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

      /* Spinner for Loading */
      .spinner {
        /* Your template uses this class */
        border: 4px solid rgba(56, 102, 65, 0.3); /* Light green border */
        border-top: 4px solid #386641; /* Dark Green spinner */
        border-radius: 50%;
        width: 24px;
        height: 24px;
        animation: spin 1s linear infinite;
        display: inline-block; /* Ensure it takes space */
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

      /* Basic Icon Placeholder */
      .icon-warning {
        /* Your template uses this class */
        font-size: 1.4rem; /* Slightly larger */
        font-weight: bold;
        line-height: 1; /* Ensure vertical alignment */
        flex-shrink: 0; /* Prevent shrinking */
      }

      /* Table Styling */
      .table-container {
        /* Your template uses this class */
        overflow-x: auto; /* Add horizontal scroll on small screens */
        margin-bottom: 1.5rem;
        border-radius: 8px; /* Apply radius here too for consistent corner treatment */
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05); /* Subtle shadow */
        background-color: #ffffff; /* Ensure white background */
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      thead {
        background-color: rgba(56, 102, 65, 0.1); /* Light green tint */
        color: #386641; /* Dark Green for header text */
        font-size: 0.95rem; /* Slightly larger header font */
      }

      th,
      td {
        padding: 1.1rem 1.4rem; /* More padding */
        text-align: left;
        border-bottom: 1px solid rgba(56, 102, 65, 0.1); /* Very light green border */
      }

      th {
        font-weight: 600; /* Semi-bold header */
        text-transform: uppercase;
        letter-spacing: 0.05em; /* Add slight letter spacing */
      }

      tbody tr:nth-child(even) {
        background-color: rgba(
          167,
          201,
          87,
          0.05
        ); /* Very light green/yellow tint for zebra stripes */
      }

      tbody tr:hover {
        background-color: rgba(
          167,
          201,
          87,
          0.1
        ); /* Light green/yellow tint hover effect */
        transition: background-color 0.2s ease-in-out;
      }

      td {
        vertical-align: middle;
        color: #386641; /* Dark Green text */
        font-size: 1rem;
      }

      .actions-column {
        /* Your template uses this class */
        width: 180px; /* More space for action buttons */
        min-width: 150px;
      }

      .actions-cell {
        /* Your template uses this class */
        display: flex;
        gap: 0.6rem; /* Space between buttons */
        align-items: center;
        /* Adjust padding as needed if using flex/gap */
        padding-top: 0.8rem;
        padding-bottom: 0.8rem;
      }

      /* Role Badges */
      .role-badge {
        /* Your template uses this class */
        display: inline-block;
        padding: 0.3rem 0.7rem; /* Padding for the badge */
        border-radius: 4px; /* Rounded corners for the badge */
        font-size: 0.85rem; /* Slightly smaller font for badge */
        font-weight: 600; /* Semi-bold badge text */
        text-align: center;
        min-width: 70px; /* Minimum width to align text */
        text-transform: capitalize; /* Ensure proper capitalization */
      }

      .role-student {
        /* Your template uses this class */
        background-color: rgba(167, 201, 87, 0.2); /* Light green/yellow tint */
        color: #386641; /* Dark Green */
        border: 1px solid rgba(56, 102, 65, 0.3); /* Subtle green border */
      }

      .role-teacher {
        /* Your template uses this class */
        background-color: rgba(106, 153, 78, 0.3); /* Medium green tint */
        color: #386641; /* Dark Green */
        border: 1px solid rgba(56, 102, 65, 0.4); /* More prominent green border */
      }

      .role-admin {
        /* Your template uses this class */
        /* Using a color outside the main palette for high visibility */
        /* Could use red from palette, but it might be too alarming */
        /* Let's try a strong blue tint with dark green text */
        background-color: rgba(18, 52, 88, 0.2); /* Blue tint */
        color: #386641; /* Dark green text */
        border: 1px solid rgba(18, 52, 88, 0.5); /* More prominent blue border */

        /* Alternative: Use red from palette but muted? */
        /* background-color: rgba(188, 71, 73, 0.2); */
        /* color: #bc4749; */
        /* border: 1px solid rgba(188, 71, 73, 0.5); */
      }

      /* --- Responsive Adjustments --- */
      @media (max-width: 992px) {
        .container {
          padding: 2rem;
          border-radius: 10px;
        }
        .dashboard-title {
          font-size: 2rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
        }
        .controls {
          gap: 1rem;
          margin-bottom: 2rem;
          flex-direction: column; /* Stack controls */
          align-items: stretch; /* Stretch controls */
        }
        .form-group {
          width: 100%; /* Make form group full width */
        }
        select {
          padding: 0.7rem 1rem;
          font-size: 0.95rem;
          border-radius: 6px;
          background-position: right 0.8rem center;
          background-size: 10px;
          padding-right: 2rem;
        }
        .btn {
          padding: 0.6rem 1.2rem;
          font-size: 0.95rem;
          border-radius: 6px;
        }
        .btn-sm {
          padding: 0.3rem 0.6rem;
          font-size: 0.85rem;
        }
        .controls .btn:not(.btn-secondary) {
          /* Make buttons in controls full width, but exclude the Go button */
          width: 100%;
        }

        /* Responsive for the new input/button group */
        .input-button-group input[type='number'] {
          width: auto; /* Let flex handle width */
          flex-grow: 1; /* Allow input to grow */
        }
        .input-button-group .btn-secondary {
          width: auto; /* Don't force full width */
        }

        .alert {
          padding: 1.2rem;
          margin-bottom: 1.5rem;
          border-radius: 6px;
          gap: 0.6rem;
          font-size: 0.95rem;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border-width: 3px;
        }
        .icon-warning {
          font-size: 1.2rem;
        }

        th,
        td {
          padding: 0.8rem 1rem; /* Less padding in table */
        }
        th {
          font-size: 0.9rem;
        }
        td {
          font-size: 0.95rem;
        }

        .actions-column {
          width: auto; /* Remove fixed width */
          min-width: 120px; /* Smaller min-width */
        }
        .actions-cell {
          gap: 0.4rem; /* Less gap in actions */
          padding-top: 0.6rem;
          padding-bottom: 0.6rem;
        }
        .role-badge {
          padding: 0.2rem 0.5rem;
          font-size: 0.8rem;
          min-width: 60px;
        }
      }

      @media (max-width: 600px) {
        .container {
          padding: 1.5rem;
          border-radius: 8px;
        }
        .dashboard-title {
          font-size: 1.8rem;
          margin-bottom: 1.2rem;
          padding-bottom: 0.8rem;
        }
        .controls {
          gap: 0.6rem;
          margin-bottom: 1.5rem;
        }
        .form-group label {
          font-size: 0.85rem;
        }
        select {
          padding: 0.6rem 0.8rem;
          font-size: 0.9rem;
          border-radius: 4px;
          background-position: right 0.6rem center;
          background-size: 8px;
          padding-right: 1.8rem;
        }
        .btn {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          border-radius: 4px;
        }
        .btn-sm {
          padding: 0.2rem 0.4rem;
          font-size: 0.75rem;
          border-radius: 3px;
        }

        /* Stack the input/button group on very small screens */
        .input-button-group {
          flex-direction: column; /* Stack items vertically */
          gap: 0.4rem; /* Less gap when stacked */
          align-items: stretch; /* Stretch items to full width */
        }
        .input-button-group input[type='number'] {
          width: 100%; /* Full width when stacked */
          max-width: none; /* Remove max-width constraint */
        }
        .input-button-group .btn-secondary {
          width: 100%; /* Full width when stacked */
          padding: 0.6rem 1rem; /* Adjust vertical padding for full width button */
          font-size: 0.95rem; /* Slightly larger font than sm */
        }

        .alert {
          padding: 0.8rem;
          margin-bottom: 1rem;
          border-radius: 4px;
          font-size: 0.9rem;
          gap: 0.4rem;
        }
        .spinner {
          width: 18px;
          height: 18px;
          border-width: 2px;
        }
        .icon-warning {
          font-size: 1.1rem;
        }
        th,
        td {
          padding: 0.6rem 0.8rem;
          font-size: 0.85rem;
        }
        th {
          font-size: 0.8rem;
        }
        .actions-column {
          min-width: 90px; /* Smaller min-width */
        }
        .actions-cell {
          gap: 0.3rem;
          padding-top: 0.4rem;
          padding-bottom: 0.4rem;
        }
        .role-badge {
          padding: 0.1rem 0.3rem;
          font-size: 0.75rem;
          min-width: auto;
        }
      }
    `,
  ],
})
export class AdminDashboardComponent {
  userService = inject(UserService);
  authService = inject(AuthService);
  router = inject(Router);
  roles = ['student', 'teacher', 'admin']; // Define roles array here

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers(role?: string) {
    // Ensure the role is one of the valid roles or undefined
    const validRole =
      role && this.roles.includes(role)
        ? (role as 'student' | 'teacher' | 'admin')
        : undefined;
    // loadUsers likely expects an object like { role: '...' } or undefined
    this.userService
      .loadUsers(validRole ? { role: validRole } : undefined)
      .subscribe({
        // Basic error handling/logging for the initial load if needed
        error: (err) => console.error('Failed to load users:', err),
      });
  }
  navigateToBranch(branchId: string) {
    if (branchId) {
      this.router.navigate(['/user/management/branch', branchId]);
    }
  }
  onRoleFilterChange(event: Event) {
    const role = (event.target as HTMLSelectElement).value;
    this.loadUsers(role || undefined);
  }

  deleteUser(id: number) {
    // Use a more descriptive confirmation
    if (
      confirm(
        'Are you sure you want to delete this user permanently? This action cannot be undone.'
      )
    ) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          console.log(`User with ID ${id} deleted successfully.`);
          // Optimistically remove the user from the list or refresh
          // A full refresh is simpler and ensures consistency
          this.refreshUsers();
        },
        error: (err) => {
          console.error(`Failed to delete user with ID ${id}:`, err);
          alert(
            'Failed to delete user: ' +
              (err.error?.message ||
                err.message ||
                'An unknown error occurred.')
          );
        },
      });
    }
  }

  refreshUsers() {
    // Reset the filter select box visually when refreshing manually
    const roleFilterElement = document.getElementById(
      'roleFilter'
    ) as HTMLSelectElement;
    if (roleFilterElement) {
      roleFilterElement.value = ''; // Set value back to the 'All Roles' option
    }
    this.loadUsers(undefined); // Load all users on manual refresh
  }
}
