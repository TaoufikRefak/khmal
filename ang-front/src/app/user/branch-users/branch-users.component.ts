import { Component, inject } from '@angular/core';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, TitleCasePipe],
  template: `
    <!-- Your original HTML template -->
    <!-- You will need to add the CSS classes mentioned below -->

    <div class="container page-container">
      <!-- Add this wrapper div -->

      <div *ngIf="!userService.loading(); else loading">
        <!-- Add class="dashboard-title" to your h2 -->
        <h2 class="dashboard-title">Users in Branch {{ branchId }}</h2>

        <!-- Add class="alert alert-danger" to the error div/p -->
        <!-- Consider wrapping the error in a div for consistent alert styling -->
        <div *ngIf="userService.error()" class="alert alert-danger">
          <span class="icon-warning">!</span>
          <!-- Add this span for the icon -->
          {{ userService.error() }}
        </div>

        <!-- Wrap your table in a div with class="table-container" -->
        <div class="table-container" *ngIf="userService.users().length > 0">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <!-- Add class="actions-column" to this th -->
                <th class="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- Add class="user-row" to the tr -->
              <tr *ngFor="let user of userService.users()" class="user-row">
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <!-- Wrap the role text in a span with class="role-badge role-{{ user.role }}" -->
                  <span class="role-badge role-{{ user.role }}">
                    {{ user.role | titlecase }}
                  </span>
                </td>
                <!-- Add class="actions-cell" to this td -->
                <td class="actions-cell">
                  <!-- Add classes="btn btn-link btn-sm" to the anchor tag -->
                  <a
                    [routerLink]="['/user/management/edit/', user.id]"
                    class="btn btn-link btn-sm"
                    >View</a
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Add class="no-data-message" to the 'No users' paragraph -->
        <p *ngIf="userService.users().length === 0" class="no-data-message">
          No users in this branch
        </p>
      </div>

      <!-- Use alert classes for loading state, if keeping ng-template structure -->
      <!-- NOTE: Styling alerts directly is often cleaner, but here we apply to ng-template content -->
      <ng-template #loading>
        <!-- Add classes="alert alert-info" to this paragraph -->
        <p class="alert alert-info">
          <span class="spinner"></span>
          <!-- Add this span for the spinner -->
          Loading branch users...
        </p>
      </ng-template>
    </div>
    <!-- Close the wrapper div -->
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
        display: flex; /* Use flexbox for centering */
        justify-content: center; /* Center horizontally */
        align-items: flex-start; /* Align to top */
        padding: 2rem;
        box-sizing: border-box;
      }

      /* --- CONTAINER --- */
      /* Wrapper around the main content */
      .page-container {
        /* Your template uses this class */
        max-width: 1200px; /* Max width for the main content */
        width: 100%;
        background-color: #ffffff; /* Keep white for crisp main content card */
        padding: 2.5rem;
        border-radius: 12px; /* Large border radius */
        box-shadow: 0 10px 30px rgba(56, 102, 65, 0.1); /* Subtle shadow using dark green */
        box-sizing: border-box;
      }

      /* --- TITLE --- */
      /* Heading style */
      .dashboard-title {
        /* Your template uses this class */
        color: #386641; /* Dark Green */
        margin-top: 0; /* Remove default margin top */
        margin-bottom: 1.8rem; /* Space below title */
        font-size: 2.4rem; /* Larger title */
        font-weight: 700; /* Bolder */
        border-bottom: 2px solid rgba(56, 102, 65, 0.2); /* Subtle green separator */
        padding-bottom: 1.2rem; /* Padding below title text */
        text-align: left;
        line-height: 1.2;
      }

      /* --- LOADING & ERROR ALERTS --- */
      /* Apply .alert and .alert-info or .alert-danger to your message divs/paragraphs */
      .alert {
        /* Your template uses this class */
        padding: 1.5rem; /* Spacious padding */
        margin: 1.5rem auto; /* Center the alert block */
        border: 1px solid transparent;
        border-radius: 8px; /* Matching radius */
        font-size: 1rem;
        text-align: center;
        display: flex; /* Layout icon and text */
        align-items: center;
        justify-content: center;
        gap: 0.8rem; /* Space between icon/spinner and text */
        max-width: 600px; /* Limit alert width */
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

      /* Apply .spinner class for a loading indicator (used inside .alert-info) */
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

      /* Apply .icon-warning class for an error icon (used inside .alert-danger) */
      .icon-warning {
        /* Add this class to your error icon */
        font-size: 1.4rem;
        font-weight: bold;
        line-height: 1; /* Ensure vertical alignment */
        flex-shrink: 0; /* Prevent shrinking */
      }

      /* --- TABLE STYLING --- */
      /* Apply this class to a div wrapping your table */
      .table-container {
        /* Your template uses this class */
        overflow-x: auto; /* Allows horizontal scrolling on small screens */
        margin-bottom: 1.5rem;
        border-radius: 8px; /* Apply radius here too for consistent corner treatment */
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05); /* Subtle shadow for the table */
        background-color: #ffffff; /* Ensure white background */
      }

      table {
        width: 100%;
        border-collapse: collapse; /* Removes space between borders */
      }

      thead {
        background-color: rgba(56, 102, 65, 0.1); /* Light green tint */
        color: #386641; /* Dark Green for header text */
        font-size: 0.95rem; /* Slightly larger header font */
      }

      th,
      td {
        padding: 1.1rem 1.4rem; /* More comfortable padding */
        text-align: left;
        border-bottom: 1px solid rgba(56, 102, 65, 0.1); /* Very light green border */
      }

      th {
        font-weight: 600; /* Semi-bold header */
        text-transform: uppercase; /* Uppercase headers */
        letter-spacing: 0.05em; /* Slight letter spacing */
      }

      /* Apply .user-row class to tr for zebra stripes */
      tbody tr.user-row:nth-child(even) {
        background-color: rgba(
          167,
          201,
          87,
          0.05
        ); /* Very light green/yellow tint for zebra stripes */
      }

      /* Apply .user-row class to tr for hover effect */
      tbody tr.user-row:hover {
        background-color: rgba(
          167,
          201,
          87,
          0.1
        ); /* Light green/yellow tint hover effect */
        transition: background-color 0.2s ease-in-out; /* Smooth transition */
      }

      td {
        vertical-align: middle; /* Center content vertically */
        color: #386641; /* Dark Green text */
        font-size: 1rem;
      }

      /* Apply .actions-column class to the th for actions */
      .actions-column {
        width: 100px; /* Slightly smaller width for this table */
        min-width: 80px;
      }

      /* Apply .actions-cell class to the td for actions */
      .actions-cell {
        display: flex; /* Use flexbox for content in the cell */
        gap: 0.6rem; /* Space between elements */
        align-items: center; /* Vertically center elements */
        /* Adjust padding as needed if using flex/gap - could set on td itself */
        /* padding-top: 0.8rem; */
        /* padding-bottom: 0.8rem; */
      }

      /* --- BUTTONS & LINKS --- */
      /* Reuse button base styles (for the 'View' link styled as a button) */
      .btn {
        /* Your template uses this class */
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600; /* Semi-bold */
        transition: background-color 0.2s ease-in-out,
          border-color 0.2s ease-in-out, color 0.2s ease-in-out,
          opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
        text-decoration: none;
        display: inline-flex; /* Use flex for alignment (e.g., text + icon) */
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
      }

      /* Smaller button size for table actions */
      .btn-sm {
        /* Your template uses this class */
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
        border-radius: 4px; /* Slightly smaller radius for small buttons */
      }

      /* Apply .btn-link class for styling an anchor tag like a button */
      /* Reusing btn-outline-primary style for 'View' link as it fits the look better */
      .btn-link {
        /* Your template uses this class */
        background-color: transparent;
        border: 1px solid #6a994e; /* Medium Green border */
        color: #6a994e; /* Medium Green text */
        padding: 0.4rem 0.8rem; /* Match btn-sm padding */
        font-size: 0.9rem; /* Match btn-sm font size */
        border-radius: 4px; /* Match btn-sm radius */

        &:hover {
          background-color: #6a994e; /* Fill with color on hover */
          color: #fff; /* White text on hover */
          text-decoration: none; /* Remove underline */
          transform: translateY(-1px); /* Subtle lift */
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        &:active {
          transform: translateY(0);
          box-shadow: none;
        }
      }

      /* --- ROLE BADGES --- */
      /* Apply .role-badge class to the span wrapping the role text */
      .role-badge {
        /* Your template uses this class */
        display: inline-block;
        padding: 0.3rem 0.7rem;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: 600;
        text-align: center;
        min-width: 70px; /* Maintain width consistency */
        text-transform: capitalize; /* Ensure capitalization */
      }

      /* Apply role-specific classes like .role-student, .role-teacher, .role-admin */
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
        /* Using a subtle blue tint for admin for distinction */
        background-color: rgba(18, 52, 88, 0.2); /* Blue tint */
        color: #386641; /* Dark green text */
        border: 1px solid rgba(18, 52, 88, 0.5); /* More prominent blue border */
      }

      /* --- NO DATA MESSAGE --- */
      /* Apply this class to the paragraph shown when the list is empty */
      .no-data-message {
        /* Your template uses this class */
        text-align: center;
        font-size: 1.1rem;
        color: rgba(56, 102, 65, 0.8); /* Muted dark green */
        padding: 2rem; /* Add some space around the message */
        background-color: rgba(
          167,
          201,
          87,
          0.05
        ); /* Very light green/yellow tint */
        border: 1px dashed rgba(56, 102, 65, 0.2); /* Dashed green border */
        border-radius: 8px;
        margin-top: 1.5rem;
      }

      /* --- Responsive Adjustments --- */
      @media (max-width: 992px) {
        .page-container {
          padding: 2rem;
          border-radius: 10px;
        }
        .dashboard-title {
          font-size: 2rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
        }
        .alert {
          padding: 1.2rem;
          margin: 1.5rem auto;
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
          min-width: 100px; /* Smaller min-width */
        }
        .actions-cell {
          gap: 0.4rem; /* Less gap in actions */
          padding-top: 0.6rem;
          padding-bottom: 0.6rem;
        }
        .btn-sm {
          padding: 0.3rem 0.6rem;
          font-size: 0.85rem;
          border-radius: 4px;
        }
        .btn-link {
          /* Adjust specific link styles */
          padding: 0.3rem 0.6rem;
          font-size: 0.85rem;
          border-radius: 4px;
        }
        .role-badge {
          padding: 0.2rem 0.5rem;
          font-size: 0.8rem;
          min-width: 60px;
        }
        .no-data-message {
          padding: 1.5rem;
          font-size: 1rem;
          border-radius: 6px;
        }
      }

      @media (max-width: 600px) {
        .page-container {
          padding: 1.5rem;
          border-radius: 8px;
        }
        .dashboard-title {
          font-size: 1.8rem;
          margin-bottom: 1.2rem;
          padding-bottom: 0.8rem;
        }
        .alert {
          padding: 1rem;
          margin: 1.5rem auto;
          border-radius: 4px;
          font-size: 0.9rem;
          gap: 0.5rem;
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
          min-width: 80px; /* Smaller min-width */
        }
        .actions-cell {
          gap: 0.3rem;
          padding-top: 0.4rem;
          padding-bottom: 0.4rem;
        }
        .btn-sm {
          padding: 0.2rem 0.5rem;
          font-size: 0.8rem;
          border-radius: 3px;
        }
        .btn-link {
          padding: 0.2rem 0.5rem;
          font-size: 0.8rem;
          border-radius: 3px;
        }
        .role-badge {
          padding: 0.1rem 0.3rem;
          font-size: 0.7rem;
          min-width: auto;
        }
        .no-data-message {
          padding: 1.2rem;
          font-size: 1rem;
          border-radius: 4px;
        }
      }
    `,
  ],
})
export class BranchUsersComponent {
  private route = inject(ActivatedRoute);
  userService = inject(UserService);
  branchId = Number(this.route.snapshot.paramMap.get('id'));

  ngOnInit() {
    // Keep your original loading logic
    this.userService.loadBranchUsers(this.branchId).subscribe();
  }
}
