import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common'; // Ensure CommonModule is imported

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterLinkActive], // Include RouterLinkActive
  template: `
    <nav class="navbar">
      <div class="nav-left">
        <!-- Use routerLinkActive to add 'active' class to the current link -->
        <!-- Apply the 'nav-link' class -->
        <a
          *ngIf="isAuthenticated"
          routerLink="/user/profile"
          class="nav-link"
          routerLinkActive="active"
          >Profile</a
        >
        <a
          *ngIf="isAuthenticated"
          routerLink="/course"
          class="nav-link"
          routerLinkActive="active"
          >Courses</a
        >
        <a
          *ngIf="isAuthenticated"
          routerLink="/playlist"
          class="nav-link"
          routerLinkActive="active"
          >Playlists</a
        >
        <a
          *ngIf="isAdmin"
          routerLink="/user/management"
          class="nav-link"
          routerLinkActive="active"
          >User Management</a
        >
      </div>

      <div class="nav-right">
        <!-- Apply the 'nav-link' class -->
        <a
          *ngIf="!isAuthenticated"
          routerLink="/v1/auth/login"
          class="nav-link"
          routerLinkActive="active"
          >Login</a
        >
        <a
          *ngIf="!isAuthenticated"
          routerLink="/v1/auth/register"
          class="nav-link"
          routerLinkActive="active"
          >Register</a
        >
        <!-- Applied btn-outline-danger and btn classes for consistent styling -->
        <!-- Apply the 'nav-button' class -->
        <button
          *ngIf="isAuthenticated"
          (click)="logout()"
          class="nav-button btn btn-outline-danger"
        >
          Logout
        </button>
      </div>
    </nav>
  `,
  styles: [
    `
      /* Poppins Font Import (Consider placing in a global style file) */
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      /* --- BASE STYLES & PALETTE --- */
      /* Using your specified palette colors */

      :host {
        font-family: 'Poppins', sans-serif;
        display: block;
        /* Header background is typically different from page background */
        background-color: #ffffff; /* White background for the header */
        box-shadow: 0 2px 8px rgba(56, 102, 65, 0.1); /* Subtle shadow using dark green */
        position: sticky;
        top: 0;
        z-index: 1000; /* Ensure header stays on top */
      }

      .navbar {
        display: flex;
        justify-content: space-between;
        background-color: transparent; /* Inherit from :host */
        padding: 1rem 2rem; /* Comfortable padding */
        color: #386641; /* Dark Green for default text */
        align-items: center;
        max-width: 1600px; /* Match container max-width */
        margin: 0 auto; /* Center navbar content */
      }

      .nav-left,
      .nav-right {
        display: flex;
        align-items: center;
        gap: 1.8rem; /* Space between nav items */
      }

      .nav-link {
        color: #386641; /* Normal link color (Dark Green) */
        text-decoration: none;
        font-weight: 500; /* Medium weight */
        font-size: 1rem;
        padding: 0.5rem 0.8rem; /* Padding for hover/click area */
        border-radius: 6px; /* Rounded corners */
        position: relative; /* Needed for pseudo-elements */
        overflow: hidden; /* Hide pseudo-elements outside padding */
        transition: color 0.3s ease-in-out, transform 0.2s ease-out; /* Smooth transitions */
        z-index: 1; /* Ensure text is above pseudo-element background */
      }

      /* --- Nav Link Animations --- */

      /* Pseudo-element for the sliding background fill */
      .nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0; /* Start from the left */
        width: 100%;
        height: 100%;
        background-color: rgba(
          167,
          201,
          87,
          0.3
        ); /* Light Green/Yellow tint background */
        z-index: -1; /* Place behind the text */
        opacity: 0; /* Start transparent */
        transform: scaleX(0); /* Start collapsed horizontally */
        transform-origin: left center; /* Scale from the left */
        transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
      }

      /* Pseudo-element for the sliding underline */
      .nav-link::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 0; /* Start with no width */
        height: 2px; /* Height of the underline */
        background-color: #6a994e; /* Medium Green for the underline */
        transition: width 0.3s ease-out; /* Animate width */
      }

      /* Hover State */
      .nav-link:hover {
        color: #6a994e; /* Text color changes to Medium Green */
        transform: translateY(-2px); /* Slight vertical lift effect */
      }

      .nav-link:hover::before {
        opacity: 1; /* Make background visible */
        transform: scaleX(1); /* Expand background to fill */
      }

      .nav-link:hover::after {
        width: 100%; /* Expand the underline */
      }

      /* Active State (Set by routerLinkActive) */
      .nav-link.active {
        color: #386641; /* Dark Green for distinct active link color */
        font-weight: 600; /* Bolder for active */
        /* Background and underline are permanently visible when active */
      }

      .nav-link.active::before {
        opacity: 1; /* Background is permanently visible */
        transform: scaleX(1);
        background-color: rgba(
          167,
          201,
          87,
          0.5
        ); /* Slightly stronger tint for active */
      }

      .nav-link.active::after {
        width: 100%; /* Underline is permanently visible */
        /* Optional: Add a subtle pulse effect to the underline */
        animation: pulseUnderline 1.5s infinite ease-in-out;
      }

      /* Optional Keyframes for Active Underline Pulse */
      @keyframes pulseUnderline {
        0% {
          transform: scaleX(1);
          opacity: 1;
        }
        50% {
          transform: scaleX(1.02); /* Slightly widen */
          opacity: 0.8;
        }
        100% {
          transform: scaleX(1);
          opacity: 1;
        }
      }

      /* --- Nav Button (Logout) --- */
      /* Using btn classes consistent with other components */

      .btn {
        padding: 0.6rem 1.2rem;
        border: 1px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out,
          border-color 0.2s ease-in-out, transform 0.2s ease-out,
          box-shadow 0.2s ease-in-out;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08); /* Subtle shadow */
        font-family: 'Poppins', sans-serif;
      }

      /* Styling the button as an outline danger button */
      .btn-outline-danger {
        background-color: transparent;
        color: #bc4749; /* Red */
        border-color: #bc4749; /* Red */
      }

      /* --- Button Animations --- */
      .btn-outline-danger:hover:not(:disabled) {
        background-color: #bc4749; /* Fill with red on hover */
        color: #ffffff; /* White text on hover */
        border-color: #a43d40; /* Darker red */
        /* More pronounced lift and shadow */
        transform: translateY(-3px);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
      }

      /* Optional: Add a subtle pulse on hover */
      .btn-outline-danger:hover:not(:disabled) {
        animation: pulseButton 1s ease-in-out infinite alternate;
      }

      @keyframes pulseButton {
        from {
          transform: scale(1) translateY(-3px); /* Start from the lifted position */
        }
        to {
          transform: scale(1.02) translateY(-3px); /* Scale up slightly */
        }
      }

      .btn-outline-danger:active:not(:disabled) {
        transform: translateY(0); /* Press down effect */
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        animation: none; /* Stop pulse when pressed */
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .navbar {
          flex-direction: column; /* Stack items vertically */
          padding: 1rem;
          gap: 1rem; /* Space between left/right sections */
          position: static; /* Don't make sticky on small screens */
          box-shadow: none; /* Remove shadow on small screens */
          border-bottom: 1px solid rgba(56, 102, 65, 0.1); /* Subtle border */
        }

        .nav-left,
        .nav-right {
          flex-direction: column; /* Stack links vertically */
          gap: 0.4rem; /* Closer space between stacked links */
          width: 100%; /* Take full width */
          align-items: stretch; /* Stretch links/buttons to fill width */
        }

        .nav-link {
          text-align: center; /* Center text */
          padding: 0.75rem 1rem; /* Adjust padding */
          /* Make pseudo-elements cover the centered text area */
          &::before,
          &::after {
            left: 50%; /* Start from center */
            transform: translateX(-50%) scaleX(0); /* Start collapsed at center */
            transform-origin: center center; /* Scale from center */
          }
          &::after {
            bottom: 0.3rem; /* Adjust underline position */
          }
          /* Remove lift effect on mobile links */
          &:hover {
            transform: none;
          }
        }

        .nav-link:hover::before {
          transform: translateX(-50%) scaleX(1); /* Scale out from center */
        }
        .nav-link.active::before {
          transform: translateX(-50%) scaleX(1); /* Scale out from center */
        }

        .nav-link:hover::after {
          width: calc(100% - 2rem); /* Underline doesn't reach edges */
        }
        .nav-link.active::after {
          width: calc(100% - 2rem); /* Underline doesn't reach edges */
        }

        .nav-button {
          width: 100%; /* Make button full width */
          margin-top: 0.8rem; /* Space above button if stacked */
          /* Adjust button padding/font for mobile */
          padding: 0.8rem 1.5rem;
          font-size: 0.95rem;
        }
        /* Remove button hover animations on mobile */
        .btn-outline-danger:hover:not(:disabled) {
          transform: none;
          box-shadow: none;
          animation: none;
        }
        .btn-outline-danger:active:not(:disabled) {
          transform: none;
        }
      }
    `,
  ],
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Using signals if your Angular version supports them, or standard getters
  get isAuthenticated(): boolean {
    // Assuming authService has a method/property for this
    return this.authService.isAuthenticated;
  }

  get isAdmin(): boolean {
    // Assuming authService has a method/property for this
    return this.authService.hasRole('admin');
  }

  // You might want to include teacher-only or teacher/admin combined conditions.
  get isTeacherOrAdmin(): boolean {
    // Assuming authService has a method/property like this, or implement logic:
    // return this.authService.hasRole('teacher') || this.authService.hasRole('admin');
    // Or if hasRole accepts an array:
    return this.authService.hasRole(['teacher', 'admin']);
  }

  logout() {
    // Assuming authService has a logout method
    this.authService.logout();
    // Optionally, navigate to the login page after logout.
    this.router.navigate(['/v1/auth/login']);
  }
}
