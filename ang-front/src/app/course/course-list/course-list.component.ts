import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  ViewChildren,
} from '@angular/core';
import { Course, CourseService } from '../services/course.service';
import { Router, RouterLink } from '@angular/router';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';
import Hls from 'hls.js';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [RouterLink, NgIf, NgFor],
  template: `
    <div class="container">
      <header class="header">
        <h1>Course Library</h1>
        <a
          *ngIf="canEdit()"
          [routerLink]="['/course', 'create']"
          class="create-button"
        >
          <svg class="plus-icon" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          New Course
        </a>
      </header>
      <div class="search-bar">
        <input
          type="text"
          placeholder="Search courses..."
          (input)="searchCourses($event)"
        />
        <svg class="search-icon" viewBox="0 0 24 24">
          <path
            d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>
      </div>
      <div class="grid-container">
        <div
          *ngFor="let course of courseService.courses(); trackBy: trackById"
          class="course-card"
          (mouseenter)="onCardHover(course)"
          (mouseleave)="onCardLeave(course)"
          (click)="viewCourse(course.id)"
        >
          <div class="thumbnail-container">
            <img
              [src]="course.thumbnail || 'assets/default-thumbnail.jpg'"
              alt="Course thumbnail"
              class="thumbnail"
            />
            <div
              class="hover-video"
              [class.visible]="hoveredCourseId === course.id"
              *ngIf="!isMobile"
            >
              <video
                #videoPlayer
                muted
                playsinline
                (canplay)="handleVideoCanPlay(course.id)"
                [hidden]="!playingVideos[course.id]"
              >
                <source
                  [src]="course.hls_url"
                  type="application/vnd.apple.mpegurl"
                />
              </video>
              <div
                class="loader"
                *ngIf="
                  hoveredCourseId === course.id && !playingVideos[course.id]
                "
              >
                Loading...
              </div>
            </div>
          </div>

          <div class="course-info">
            <h3 class="title">{{ course.title }}</h3>
            <div class="meta">
              <span class="teacher">{{
                getTeacherName(course.teacher_id)
              }}</span>
              <span class="views">{{ course.views || 0 }} views</span>
              <span class="likes">{{ course.like_count || 0 }} likes</span>
            </div>

            <div *ngIf="canEdit()" class="admin-actions">
              <a
                [routerLink]="['/course', course.id, 'edit']"
                class="button-edit"
                (click)="$event.stopPropagation()"
              >
                Edit
              </a>
              <button
                (click)="deleteCourse(course.id); $event.stopPropagation()"
                class="button-delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Add after grid-container -->
      <div class="pagination-controls" *ngIf="totalPages > 1">
        <button
          (click)="prevPage()"
          [disabled]="currentPage === 1"
          class="pagination-button prev"
        >
          Previous
        </button>

        <span class="pagination-status">
          Page {{ currentPage }} of {{ totalPages }}
          <span class="pagination-total">{{ paginationStatus }}</span>
        </span>

        <button
          (click)="nextPage()"
          [disabled]="currentPage === totalPages"
          class="pagination-button next"
        >
          Next
        </button>
      </div>
      <div *ngIf="courseService.loading()" class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading courses...</p>
      </div>

      <div *ngIf="courseService.error()" class="error-message">
        <svg class="warning-icon" viewBox="0 0 24 24">
          <path
            d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z"
          />
        </svg>
        <div class="error-content">
          <h3>Oops! Something went wrong</h3>
          <p>{{ courseService.error() }}</p>
        </div>
      </div>

      <div
        *ngIf="!courseService.loading() && courseService.courses().length === 0"
        class="empty-state"
      >
        <svg class="empty-icon" viewBox="0 0 24 24">
          <path
            d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"
          />
        </svg>
        <h3>No courses found</h3>
        <a
          *ngIf="canEdit()"
          [routerLink]="['/course', 'create']"
          class="button-primary"
        >
          Create First Course
        </a>
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
        box-sizing: border-box;
      }

      .container {
        padding: 2rem;
        max-width: 1600px; /* Wider container */
        margin: 0 auto;
        min-height: 100vh;
        box-sizing: border-box;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2.5rem; /* More space below header */
      }

      h1 {
        color: #386641; /* Dark Green */
        margin: 0;
        font-size: 2.5rem; /* Larger title */
        font-weight: 700;
        letter-spacing: -0.8px;
      }
      .search-bar {
        position: relative;
        margin-bottom: 2rem;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }

      .search-bar input {
        width: 100%;
        padding: 0.8rem 1.5rem;
        padding-left: 2.5rem;
        border-radius: 8px;
        border: 2px solid rgba(56, 102, 65, 0.3);
        font-size: 1rem;
        transition: all 0.3s ease;
      }

      .search-bar input:focus {
        outline: none;
        border-color: #386641;
        box-shadow: 0 2px 8px rgba(56, 102, 65, 0.2);
      }

      .search-icon {
        position: absolute;
        left: 0.8rem;
        top: 50%;
        transform: translateY(-50%);
        width: 1.2rem;
        height: 1.2rem;
        fill: rgba(56, 102, 65, 0.6);
      }

      @media (max-width: 768px) {
        .search-bar {
          margin-bottom: 1.5rem;
        }
      }
      /* Create Button (Primary Action) */
      .create-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.9rem 1.8rem; /* Standard button padding */
        background: #386641; /* Dark Green */
        color: white;
        border-radius: 8px; /* Rounded corners */
        text-decoration: none;
        font-weight: 600;
        transition: all 0.2s ease;
        box-shadow: 0 4px 15px rgba(56, 102, 65, 0.3); /* Matching shadow */
      }

      .create-button:hover {
        background: #2b4c31; /* Darker shade on hover */
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(56, 102, 65, 0.4);
      }
      .create-button:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(56, 102, 65, 0.4);
      }

      .plus-icon {
        width: 1.3rem; /* Slightly larger icon */
        height: 1.3rem;
        fill: currentColor; /* Use the text color */
      }

      .grid-container {
        display: grid;
        grid-template-columns: repeat(
          auto-fill,
          minmax(320px, 1fr)
        ); /* Slightly wider min size */
        gap: 2.5rem; /* More space between cards */
        padding: 1rem 0;
      }

      .course-card {
        background: #ffffff; /* Keep white for cards for cleanliness */
        border-radius: 12px; /* More rounded corners */
        box-shadow: 0 8px 20px rgba(56, 102, 65, 0.1); /* Subtle shadow using dark green */
        overflow: hidden;
        transition: transform 0.3s ease, box-shadow 0.3s ease; /* Smooth transitions */
        cursor: pointer;
        display: flex; /* Flexbox for layout inside card */
        flex-direction: column; /* Stack thumbnail and info */

        &:hover {
          transform: translateY(-8px); /* More noticeable lift */
          box-shadow: 0 12px 30px rgba(56, 102, 65, 0.15);
        }
      }

      .thumbnail-container {
        position: relative;
        padding-top: 56.25%; /* 16:9 aspect ratio */
        background: #030303; /* Dark background for video */
        flex-shrink: 0; /* Prevent container from shrinking */
        /* Ensure thumbnail container is positioned relative for absolute children */
        position: relative;
      }

      .thumbnail {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.3s ease; /* Fade out thumbnail */
        /* Show thumbnail by default */
        opacity: 1;
        z-index: 1; /* Ensure thumbnail is above video when not hovered */
      }

      .hover-video {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.3s ease; /* Fade in video */
        background-color: #030303; /* Dark background while loading */
        z-index: 2; /* Video should be above thumbnail */
        visibility: hidden; /* Initially hidden */

        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block; /* Remove extra space */
        }

        &.visible {
          opacity: 1;
          visibility: visible;
        }
      }

      .loader {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ffffff; /* White text over dark background */
        font-weight: 500;
        z-index: 3; /* Above video */
      }

      .course-info {
        padding: 1.5rem; /* More padding */
        flex-grow: 1; /* Allow info to grow */
        display: flex;
        flex-direction: column;
      }

      .title {
        margin: 0 0 0.8rem; /* More space below title */
        font-size: 1.2rem; /* Slightly larger title */
        font-weight: 600;
        color: #386641; /* Dark Green */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.4;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem; /* More space between meta items */
        font-size: 0.95rem; /* Slightly larger meta text */
        color: rgba(56, 102, 65, 0.7); /* Muted dark green */
        margin-bottom: 1.5rem; /* More space below meta */
        margin-top: auto; /* Push meta/actions to the bottom */
      }

      .admin-actions {
        display: flex;
        gap: 0.8rem; /* Space between admin buttons */
        margin-top: 1rem;
      }

      /* Admin Buttons */
      .button-edit,
      .button-delete {
        padding: 0.6rem 1.2rem; /* Adjusted padding */
        border-radius: 6px; /* Slightly less rounded */
        font-size: 0.95rem; /* Standard size */
        font-weight: 500;
        transition: all 0.2s ease;
        text-decoration: none; /* For RouterLink */
        text-align: center;
        display: inline-flex; /* Ensure flex properties apply */
        justify-content: center; /* Center text */
        align-items: center; /* Center text */
      }

      .button-edit {
        background: rgba(167, 201, 87, 0.2); /* Light Green/Yellow tint */
        color: #386641; /* Dark Green text */
        border: 1px solid rgba(56, 102, 65, 0.3); /* Subtle green border */

        &:hover {
          background: rgba(167, 201, 87, 0.4); /* Darker tint on hover */
        }
      }

      .button-delete {
        background: #bc4749; /* Red background */
        color: white; /* White text */
        border: 1px solid #bc4749; /* Red border */
        cursor: pointer;

        &:hover {
          background: #a43d40; /* Darker red on hover */
          border-color: #a43d40;
        }
      }

      /* --- Loading Spinner --- */
      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center; /* Center vertically */
        padding: 3rem;
        color: rgba(56, 102, 65, 0.8); /* Muted dark green */
        font-size: 1.2rem;
        font-weight: 500;
      }

      .spinner {
        width: 50px;
        height: 50px;
        border: 5px solid rgba(56, 102, 65, 0.2); /* Light green border */
        border-top: 5px solid #386641; /* Dark Green spinner */
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1.5rem;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      /* --- Error Message --- */
      .error-message {
        display: flex;
        gap: 1.5rem; /* More space */
        padding: 2rem; /* More padding */
        background: rgba(188, 71, 73, 0.1); /* Light red tint */
        border-radius: 8px;
        margin: 2rem auto; /* Center error message */
        max-width: 800px; /* Limit width */
        border: 1px solid rgba(188, 71, 73, 0.3); /* Red border */
        align-items: center; /* Vertically align */
      }

      .warning-icon {
        width: 2.5rem; /* Larger icon */
        height: 2.5rem;
        flex-shrink: 0;
        fill: #bc4749; /* Red */
      }

      .error-content h3 {
        margin: 0 0 0.5rem;
        color: #bc4749; /* Red */
        font-size: 1.4rem; /* Consistent title size */
        font-weight: 600;
      }
      .error-content p {
        margin: 0;
        color: rgba(56, 102, 65, 0.8); /* Muted dark green for error details */
        font-size: 1rem;
      }

      /* --- Empty State --- */
      .empty-state {
        text-align: center;
        padding: 4rem 1rem; /* More padding */
        background: #ffffff; /* White background */
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(56, 102, 65, 0.1);
        margin-top: 2.5rem;
        max-width: 600px; /* Limit width */
        margin-left: auto; /* Center empty state */
        margin-right: auto; /* Center empty state */
      }

      .empty-state .empty-icon {
        width: 5rem; /* Larger icon */
        height: 5rem;
        fill: rgba(56, 102, 65, 0.3); /* Muted green */
        margin-bottom: 1.5rem;
      }
      .empty-state h3 {
        color: #386641; /* Dark Green */
        font-size: 1.8rem; /* Consistent title size */
        margin-bottom: 1.5rem;
      }

      .empty-state .button-primary {
        /* Style the button in the empty state */
        display: inline-flex; /* Keep it inline */
        margin-top: 1.5rem; /* Space above button */
        padding: 1rem 2.5rem; /* Generous padding */
        font-size: 1.1rem;
        background-color: #386641; /* Dark Green */
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(56, 102, 65, 0.3);
      }
      .empty-state .button-primary:hover {
        background-color: #2b4c31; /* Darker shade on hover */
        box-shadow: 0 6px 20px rgba(56, 102, 65, 0.4);
        transform: translateY(-2px);
      }

      /* --- Responsive Adjustments --- */
      @media (max-width: 1200px) {
        /* Adjust grid for slightly smaller large screens */
        .container {
          padding: 0 1.5rem;
        }
        .grid-container {
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }
        .course-card {
          border-radius: 10px;
        }
        .course-info {
          padding: 1.2rem;
        }
        .title {
          font-size: 1.1rem;
          margin-bottom: 0.6rem;
        }
        .meta {
          font-size: 0.9rem;
          gap: 0.8rem;
          margin-bottom: 1rem;
        }
        .admin-actions {
          gap: 0.6rem;
        }
        .button-edit,
        .button-delete {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          border-radius: 5px;
        }
        h1 {
          font-size: 2.2rem;
        }
        .create-button {
          padding: 0.8rem 1.5rem;
          font-size: 1rem;
          border-radius: 6px;
        }
        .plus-icon {
          width: 1.1rem;
          height: 1.1rem;
        }
        .loading-spinner {
          padding: 2rem;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border-width: 4px;
        }
        .loading-spinner p {
          font-size: 1.1rem;
        }
        .error-message {
          padding: 1.5rem;
          gap: 1rem;
          border-radius: 6px;
        }
        .warning-icon {
          width: 2rem;
          height: 2rem;
        }
        .error-content h3 {
          font-size: 1.3rem;
        }
        .error-content p {
          font-size: 0.95rem;
        }
        .empty-state {
          padding: 3rem 1rem;
          border-radius: 10px;
        }
        .empty-state .empty-icon {
          width: 4rem;
          height: 4rem;
        }
        .empty-state h3 {
          font-size: 1.6rem;
        }
        .empty-state .button-primary {
          padding: 0.9rem 2rem;
          font-size: 1rem;
          border-radius: 6px;
        }
      }

      @media (max-width: 768px) {
        .grid-container {
          grid-template-columns: 1fr; /* Stack cards */
          gap: 1.5rem;
        }

        .header {
          flex-direction: column;
          gap: 1.2rem;
          align-items: stretch;
          margin-bottom: 2rem;
        }
        h1 {
          font-size: 2rem;
          text-align: center; /* Center title */
        }
        .create-button {
          width: 100%; /* Full width button */
          justify-content: center; /* Center text/icon */
        }

        .course-card {
          border-radius: 8px;
        }
        .course-info {
          padding: 1rem;
        }
        .title {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        .meta {
          font-size: 0.9rem;
          gap: 0.6rem;
          margin-bottom: 0.8rem;
        }
        .admin-actions {
          margin-top: 0.8rem;
        }
        .button-edit,
        .button-delete {
          padding: 0.4rem 0.8rem;
          font-size: 0.85rem;
          border-radius: 4px;
        }

        .loading-spinner {
          padding: 1.5rem;
          font-size: 1rem;
        }
        .spinner {
          width: 30px;
          height: 30px;
          border-width: 3px;
          margin-bottom: 0.8rem;
        }
        .loading-spinner p {
          font-size: 1rem;
        }
        .error-message {
          padding: 1.2rem;
          gap: 0.8rem;
          border-radius: 4px;
        }
        .warning-icon {
          width: 1.8rem;
          height: 1.8rem;
        }
        .error-content h3 {
          font-size: 1.2rem;
          margin-bottom: 0.3rem;
        }
        .error-content p {
          font-size: 0.9rem;
        }

        .empty-state {
          padding: 2rem 1rem;
          border-radius: 8px;
        }
        .empty-state .empty-icon {
          width: 3rem;
          height: 3rem;
          margin-bottom: 1rem;
        }
        .empty-state h3 {
          font-size: 1.4rem;
          margin-bottom: 1rem;
        }
        .empty-state .button-primary {
          padding: 0.8rem 1.5rem;
          font-size: 0.95rem;
          border-radius: 6px;
        }
        /* Add to component styles */
        .pagination-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1.5rem;
          margin: 2.5rem 0;
          padding: 1rem;
        }

        .pagination-button {
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          border: 1px solid #386641;
          background: transparent;
          color: #386641;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover:not([disabled]) {
            background: rgba(56, 102, 65, 0.1);
            transform: translateY(-2px);
          }

          &:active:not([disabled]) {
            transform: translateY(0);
          }

          &[disabled] {
            opacity: 0.5;
            cursor: not-allowed;
            border-color: rgba(56, 102, 65, 0.3);
          }
        }

        .pagination-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          color: rgba(56, 102, 65, 0.8);
          font-size: 0.95rem;

          .pagination-total {
            font-size: 0.85rem;
            color: rgba(56, 102, 65, 0.6);
          }
        }

        @media (max-width: 768px) {
          .pagination-controls {
            flex-direction: column;
            gap: 1rem;
          }

          .pagination-button {
            width: 100%;
            max-width: 200px;
          }
        }
      }
    `,
  ],
})
export class CourseListComponent implements OnInit, OnDestroy {
  courseService = inject(CourseService);
  router = inject(Router);
  authService = inject(AuthService);
  hoveredCourseId: number | null = null;
  hoverTimeout: any;
  isMobile = false;

  itemsPerPage = 8;

  @ViewChildren('videoPlayer') videoPlayers!: QueryList<
    ElementRef<HTMLVideoElement>
  >;
  playingVideos: { [key: number]: boolean } = {};
  private hlsInstances: { [key: number]: Hls } = {};
  searchTerm = signal<string>('');
  private searchDebounce?: any;

  searchCourses(event: Event) {
    clearTimeout(this.searchDebounce);
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);

    // Debounce search by 300ms
    this.searchDebounce = setTimeout(() => {
      this.courseService
        .loadCourses(1, this.itemsPerPage, { search: term })
        .subscribe();
    }, 300);
  }
  ngOnInit() {
    this.courseService.loadCourses(1, this.itemsPerPage).subscribe();

    this.checkMobile();
  }
  get currentPage() {
    return this.courseService.currentPage();
  }

  get totalPages() {
    return this.courseService.totalPages();
  }

  get totalItems() {
    return this.courseService.totalItems();
  }

  nextPage() {
    this.courseService
      .loadCourses(this.currentPage + 1, this.itemsPerPage)
      .subscribe();
  }

  prevPage() {
    this.courseService
      .loadCourses(this.currentPage - 1, this.itemsPerPage)
      .subscribe();
  }

  loadCourses() {
    this.courseService
      .loadCourses(this.currentPage, this.itemsPerPage)
      .subscribe();
  }

  // Update template bindings
  get paginationStatus() {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return `Showing ${start}-${end} of ${this.totalItems} courses`;
  }

  trackById(index: number, course: Course) {
    return course.id;
  }

  onCardHover(course: Course) {
    if (this.isMobile) return;
    this.hoveredCourseId = course.id;
    this.playingVideos[course.id] = false;
    clearTimeout(this.hoverTimeout);
    this.hoverTimeout = setTimeout(() => this.startHoverVideo(course), 500);
  }

  private startHoverVideo(course: Course) {
    const videoRef = this.getVideoElement(course.id);
    if (!videoRef || this.hlsInstances[course.id]) return;
    const videoEl = videoRef.nativeElement;
    if (Hls.isSupported()) {
      const hls = new Hls();
      this.hlsInstances[course.id] = hls;
      hls.loadSource(course.hls_url);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(() => {}));
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = course.hls_url;
      videoEl.play().catch(() => {});
    }
  }

  onCardLeave(course: Course) {
    clearTimeout(this.hoverTimeout);
    const id = course.id;
    this.hoveredCourseId = null;
    const videoRef = this.getVideoElement(id);
    if (videoRef) {
      const videoEl = videoRef.nativeElement;
      videoEl.pause();
      videoEl.currentTime = 0;
      if (this.hlsInstances[id]) {
        this.hlsInstances[id].destroy();
        delete this.hlsInstances[id];
      }
    }
    delete this.playingVideos[id];
  }

  handleVideoCanPlay(courseId: number) {
    this.playingVideos[courseId] = true;
  }

  ngOnDestroy() {
    Object.values(this.hlsInstances).forEach((hls) => hls.destroy());
    this.videoPlayers.forEach((video) => {
      video.nativeElement.pause();
      video.nativeElement.src = '';
    });
  }

  private getVideoElement(courseId: number) {
    return this.videoPlayers.find(
      (_, i) => this.courseService.courses()[i]?.id === courseId
    );
  }

  checkMobile() {
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
  }

  getTeacherName(teacherId: number) {
    return `Teacher ${teacherId}`;
  }

  viewCourse(courseId: number) {
    this.router.navigate(['/course', courseId]);
  }

  canEdit(): boolean {
    return this.authService.hasRole(['teacher', 'admin']);
  }

  deleteCourse(id: number) {
    if (confirm('Are you sure you want to delete this course?')) {
      this.courseService.deleteCourse(id).subscribe();
    }
  }
}
