import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
} from '@angular/router';
import { CourseService, Course, Comment } from '../services/course.service';
import { PlaylistService } from '../../playlist/services/playlist.service';
import { NgIf, NgFor, DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Hls from 'hls.js';
import { AuthService } from '../../auth/services/auth.service';
import { HttpClient } from '@angular/common/http';
import {
  catchError,
  filter,
  forkJoin,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';
import { timeout } from 'rxjs/operators';
@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, CommonModule],
  template: `
    <div class="container">
      <div class="detail-card">
        <div *ngIf="course; else loading">
          <h2>{{ course.title }}</h2>
          <p class="course-description">{{ course.description }}</p>

          <div class="video-container">
            <video #videoPlayer controls class="video-player">
              <source
                [src]="course.hls_url"
                type="application/vnd.apple.mpegurl"
              />
              Your browser does not support HLS playback.
            </video>
          </div>

          <div class="course-meta">
            <div class="meta-item">
              <span class="meta-label">Teacher ID:</span>
              <span class="meta-value">{{ course.teacher_id }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Branch ID:</span>
              <span class="meta-value">{{ course.branch_id }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Created:</span>
              <span class="meta-value">{{ course.created_at | date }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Updated:</span>
              <span class="meta-value">{{ course.updated_at | date }}</span>
            </div>
          </div>

          <div class="action-bar">
            <ng-container *ngIf="canEdit()">
              <a
                [routerLink]="['/course', course.id, 'edit']"
                class="button-edit"
              >
                <i class="edit-icon"></i> Edit Course
              </a>
            </ng-container>

            <button (click)="toggleLike()" class="button-like">
              {{ isLiked ? '❤️ Liked' : '🤍 Like' }} ({{
                course.like_count || 0
              }})
            </button>
          </div>

          <div class="playlist-section">
            <button (click)="addToPlaylist()" class="button-secondary">
              📁 Add to Playlist
            </button>
            <div *ngIf="showPlaylistSelect" class="playlist-select">
              <div *ngIf="playlistService.loading(); else playlistsLoaded">
                Loading playlists...
              </div>

              <ng-template #playlistsLoaded>
                <select [(ngModel)]="selectedPlaylistId" class="form-select">
                  <option
                    *ngFor="let playlist of playlistService.playlists()"
                    [value]="playlist.id"
                  >
                    {{ playlist.name }}
                  </option>
                </select>
                <div class="button-group">
                  <button (click)="confirmAdd()" class="button-primary">
                    Add
                  </button>
                  <button (click)="cancelAdd()" class="button-secondary">
                    Cancel
                  </button>
                </div>
              </ng-template>
            </div>
          </div>

          <div class="comments-section">
            <h3>💬 Comments ({{ comments.length }})</h3>
            <div *ngIf="comments && comments.length; else noComments">
              <div *ngFor="let comment of comments" class="comment">
                <div class="comment-header">
                  <span class="comment-author">{{ comment.user_email }}</span>
                  <span class="comment-date">{{
                    comment.created_at | date : 'medium'
                  }}</span>
                  <button
                    *ngIf="comment.user_id === currentUserId"
                    (click)="deleteComment(comment.id)"
                    class="button-delete"
                  >
                    🗑️
                  </button>
                </div>
                <p class="comment-text">{{ comment.text }}</p>
              </div>
            </div>
            <ng-template #noComments>
              <p class="no-comments">
                No comments yet. Be the first to share your thoughts!
              </p>
            </ng-template>
            <div class="add-comment">
              <textarea
                [(ngModel)]="newCommentText"
                placeholder="Write your comment here..."
                rows="3"
                class="comment-input"
              ></textarea>
              <button (click)="submitComment()" class="button-primary">
                Post Comment
              </button>
            </div>
          </div>
        </div>

        <ng-template #loading>
          <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading course details...</p>
          </div>
        </ng-template>
      </div>
      <div class="sidebar">
        <h3>{{ playlistId ? 'Playlist Courses' : 'Recommended Courses' }}</h3>

        <div *ngIf="playlistId; else recommendationsBlock">
          <div *ngIf="playlistLoading" class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading playlist courses...</p>
          </div>

          <div *ngIf="!playlistLoading" class="recommendations-list">
            <div
              *ngFor="let course of playlistCourses"
              class="recommendation-card"
              [routerLink]="['/course', course.id]"
              [queryParams]="{ playlistId: playlistId }"
            >
              <div
                class="thumbnail"
                [style.backgroundImage]="
                  'url(' +
                  (course.thumbnail || 'assets/default-thumbnail.jpg') +
                  ')'
                "
              ></div>
              <div class="course-info">
                <h4>{{ course.title }}</h4>
                <div class="stats">
                  <span>👤 {{ course.views || 0 }}</span>
                  <span>❤️ {{ course.like_count || 0 }}</span>
                </div>
              </div>
            </div>

            <div *ngIf="playlistCourses.length === 0" class="fallback">
              <p>No courses in this playlist</p>
            </div>
          </div>
        </div>

        <ng-template #recommendationsBlock>
          <div *ngIf="recsLoading" class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading recommendations...</p>
          </div>

          <div *ngIf="!recsLoading" class="recommendations-list">
            <div *ngIf="recommendedCourses.length; else noRecsFallback">
              <div
                *ngFor="let course of recommendedCourses"
                class="recommendation-card"
                [routerLink]="['/course', course.id]"
              >
                <div
                  class="thumbnail"
                  [style.backgroundImage]="'url(' + course.thumbnail + ')'"
                ></div>
                <div class="course-info">
                  <h4>{{ course.title }}</h4>
                  <div class="stats">
                    <span>👤 {{ course.views || 0 }}</span>
                    <span>❤️ {{ course.like_count || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <ng-template #noRecsFallback>
              <div class="fallback">
                <p>📭 No recommendations available yet</p>
                <p *ngIf="!playlistId">
                  Explore more courses to get personalized suggestions!
                </p>
              </div>
            </ng-template>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  /* Inside your @Component decorator's styles: [...] */
  styles: [
    `
      /* Import a nice font - Poppins from Google Fonts */
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      :host {
        display: block; /* Make host element block */
        font-family: 'Poppins', sans-serif;
        /* Use the very light beige as the background */
        background-color: #f2e8cf;
        color: #386641; /* Use the dark green for main text */
        min-height: 100vh;
        padding: 2rem 0; /* Add vertical padding */
        box-sizing: border-box; /* Include padding in element's total width and height */
      }

      .container {
        display: grid;
        grid-template-columns: 1fr 350px; /* Slightly wider sidebar for better card layout */
        gap: 3rem; /* More space between main content and sidebar */
        max-width: 1300px; /* Slightly wider max width */
        margin: 0 auto; /* Center the container */
        padding: 0 2rem; /* Add horizontal padding */
        box-sizing: border-box;
        align-items: start; /* Align items to the top */
      }

      /* --- Cards and Containers --- */
      .detail-card,
      .sidebar {
        background: #ffffff; /* Keep white for crisper cards or use #f2e8cf */
        border-radius: 12px; /* More rounded corners */
        box-shadow: 0 10px 30px rgba(56, 102, 65, 0.1); /* Subtle shadow using the dark green */
        padding: 3rem; /* Increased padding */
      }

      .sidebar {
        position: sticky;
        top: 2rem; /* Stick below potential header/nav */
        max-height: calc(100vh - 4rem); /* Limit height to prevent overflow */
        overflow-y: auto; /* Enable scrolling if content is tall */
      }

      /* Style for scrollbar (webkit) in sidebar */
      .sidebar::-webkit-scrollbar {
        width: 8px;
      }
      .sidebar::-webkit-scrollbar-track {
        background: rgba(56, 102, 65, 0.1); /* Light track using green tint */
        border-radius: 4px;
      }
      .sidebar::-webkit-scrollbar-thumb {
        background: #6a994e; /* Medium Green thumb */
        border-radius: 4px;
      }
      .sidebar::-webkit-scrollbar-thumb:hover {
        background: #386641; /* Dark Green on hover */
      }

      /* --- Video Player --- */
      .video-container {
        margin-bottom: 2.5rem; /* More space below video */
        border-radius: 8px; /* Rounded corners */
        overflow: hidden; /* Ensure video corners are rounded */
        box-shadow: 0 8px 20px rgba(3, 3, 3, 0.5); /* Pronounced shadow using a dark base */
        background-color: #030303; /* Keep a dark background for the player */
        position: relative; /* Needed for potential fallback message */
        aspect-ratio: 16 / 9; /* Maintain a standard video aspect ratio */
      }

      .video-player {
        width: 100%;
        height: 100%; /* Fill the container */
        display: block; /* Remove extra space below video */
        object-fit: cover; /* Ensure video covers the container */
        /* Optional: Hide default controls if you use custom ones */
        /* &::-webkit-media-controls { display: none !important; }
           &::--webkit-media-controls-enclosure { display: none !important; } */
      }

      /* Style for HLS fallback message */
      .video-fallback {
        /* Add this class to your fallback div in HTML */
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(242, 232, 207, 0.95); /* Light beige overlay */
        color: #386641; /* Dark green text */
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        text-align: center;
        font-size: 1.1rem;
      }
      .video-fallback p {
        margin: 0;
      }

      /* --- Typography --- */
      h2 {
        /* Course Title */
        color: #386641; /* Dark Green */
        font-size: 2.8rem; /* Larger title */
        margin-bottom: 1.5rem; /* Space below title */
        font-weight: 700; /* Bolder title */
        line-height: 1.2;
        letter-spacing: -1px; /* Tighter spacing */
      }

      .course-description {
        color: rgba(
          56,
          102,
          65,
          0.8
        ); /* Slightly lighter dark green for description */
        font-size: 1.1rem;
        line-height: 1.7; /* More space between lines */
        margin-bottom: 3rem; /* More space below description */
      }

      h3 {
        /* Section titles (Comments, Recommendations) */
        color: #386641; /* Dark Green */
        font-size: 1.8rem; /* Larger section titles */
        margin-bottom: 2rem; /* More space below section title */
        font-weight: 600;
      }

      /* --- Metadata --- */
      .course-meta {
        display: grid;
        grid-template-columns: repeat(
          auto-fit,
          minmax(180px, 1fr)
        ); /* More flexible columns, slightly wider min */
        gap: 2rem; /* More space between meta items */
        margin-bottom: 3rem; /* More space below meta section */
        padding: 2rem; /* More padding */
        background: rgba(
          167,
          201,
          87,
          0.2
        ); /* Light Green/Yellow tint background */
        border-radius: 8px;
        border: 1px solid rgba(56, 102, 65, 0.1); /* Subtle border using dark green */
      }

      .meta-item {
        display: flex;
        flex-direction: column;
      }

      .meta-label {
        font-weight: 600;
        color: #386641; /* Dark green for labels in meta for contrast */
        font-size: 0.95rem; /* Slightly larger label font */
        margin-bottom: 0.5rem; /* More space below label */
      }

      .meta-value {
        color: #386641; /* Use dark green for values */
        font-size: 1rem;
        word-break: break-word; /* Prevent long values from overflowing */
      }

      /* --- Action Bar --- */
      .action-bar {
        display: flex;
        flex-wrap: wrap; /* Allow wrapping on smaller screens */
        gap: 1.5rem; /* More space between items */
        align-items: center;
        margin-bottom: 3rem; /* More space below action bar */
        padding: 1.5rem 0; /* More vertical padding */
        border-top: 1px solid rgba(56, 102, 65, 0.2); /* Subtle green border */
        border-bottom: 1px solid rgba(56, 102, 65, 0.2); /* Subtle green border */
      }

      /* Base Button Styles */
      button,
      .button-edit {
        /* Apply to both button and routerLink styled as button */
        display: inline-flex;
        align-items: center;
        padding: 1rem 2rem; /* Standard button padding */
        border: none;
        border-radius: 8px; /* Rounded corners */
        font-size: 1.1rem; /* Larger font size */
        font-weight: 600; /* Bolder text */
        cursor: pointer;
        transition: all 0.2s ease; /* Smooth transitions */
        text-decoration: none; /* Remove underline from RouterLink */
        text-align: center; /* Center text */
        justify-content: center; /* Center content */
      }

      /* Primary Button (Add to Playlist, Post Comment) */
      .button-primary {
        background-color: #386641; /* Dark Green */
        color: white; /* White text for contrast */
        box-shadow: 0 4px 15px rgba(56, 102, 65, 0.3); /* Matching vibrant shadow */
      }
      .button-primary:hover {
        background-color: #2b4c31; /* Darker shade on hover */
        box-shadow: 0 6px 20px rgba(56, 102, 65, 0.4);
        transform: translateY(-2px); /* More noticeable lift */
      }
      .button-primary:active {
        box-shadow: 0 2px 8px rgba(56, 102, 65, 0.4);
        transform: translateY(0); /* Return to original position */
      }

      /* Secondary Button (Add to Playlist trigger) */
      /* Using button-secondary for the trigger button as per original template */
      button.button-secondary {
        background-color: #6a994e; /* Medium Green */
        color: white; /* White text for contrast */
        border: 1px solid rgba(56, 102, 65, 0.1); /* Subtle border */
        padding: 1rem 2rem; /* Consistent padding */
        font-size: 1.1rem; /* Consistent font size */
      }
      button.button-secondary:hover {
        background-color: #588244; /* Slightly darker medium green */
        border-color: rgba(56, 102, 65, 0.2);
        transform: translateY(-1px); /* Subtle lift */
      }
      button.button-secondary:active {
        background-color: #6a994e;
        border-color: rgba(56, 102, 65, 0.2);
        transform: translateY(0); /* No lift */
      }

      /* Edit Button (RouterLink) */
      .button-edit {
        background-color: rgba(56, 102, 65, 0.1); /* Very light green tint */
        color: #386641; /* Dark Green text */
        border: 1px solid rgba(56, 102, 65, 0.3); /* More prominent green border */
        box-shadow: 0 4px 10px rgba(56, 102, 65, 0.1);
      }
      .button-edit:hover {
        background-color: rgba(56, 102, 65, 0.2);
        box-shadow: 0 6px 15px rgba(56, 102, 65, 0.2);
        transform: translateY(-2px);
      }
      .button-edit:active {
        box-shadow: 0 2px 8px rgba(56, 102, 65, 0.2);
        transform: translateY(0);
      }

      /* Like Button */
      .button-like {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem; /* Space between icon and count */
        padding: 1rem 1.5rem; /* Slightly less horizontal padding */
        background: transparent; /* No background */
        border: 2px solid #6a994e; /* Medium Green border */
        border-radius: 8px;
        color: #386641; /* Dark Green text */
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 1.1rem; /* Consistent font size */
      }

      .button-like:hover {
        border-color: #386641; /* Dark Green border on hover */
        color: #2b4c31; /* Darker green text */
        background-color: rgba(
          56,
          102,
          65,
          0.05
        ); /* Subtle green tint background */
      }

      .button-like span {
        /* Assuming spans for icon and count */
        vertical-align: middle;
      }

      /* --- Playlist Select Dialog (Modal Styling) --- */
      /* Assumes a parent div with class 'playlist-select-dialog' wrapping 'playlist-select' */
      .playlist-select-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(3, 3, 3, 0.6); /* Overlay using a dark base */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100; /* Above other content */
      }

      .playlist-select {
        /* The inner dialog content */
        background: #ffffff; /* Keep white background */
        padding: 2.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(3, 3, 3, 0.2);
        max-width: 450px;
        width: 90%;
        text-align: center; /* Center contents like buttons */
        position: relative; /* Needed if you add a close button */
        box-sizing: border-box;
      }

      .playlist-select h4 {
        /* Add a title in your HTML */
        color: #386641; /* Dark Green */
        margin-top: 0;
        margin-bottom: 2rem;
        font-size: 1.6rem;
        font-weight: 600;
      }

      /* Style for "No playlists" message */
      .no-playlists-msg {
        /* Add this class to your <p> tag */
        color: rgba(56, 102, 65, 0.8); /* Muted dark green */
        margin-bottom: 2rem;
        line-height: 1.6;
        font-size: 1.1rem;
      }

      .form-select {
        width: 100%;
        padding: 1rem 1.2rem; /* Consistent padding with inputs */
        border: 1px solid rgba(56, 102, 65, 0.3); /* Subtle green border */
        border-radius: 8px;
        margin-bottom: 2rem; /* Space before buttons */
        background-color: #ffffff; /* White background */
        color: #386641; /* Dark Green text */
        font-size: 1rem;
        appearance: none; /* Remove default arrow */
        background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23386641%22%20d%3D%22M287%2C114.7L159.1%2C21.3c-5.3-4.2-12.9-4.2-18.2%2C0L5.4%2C114.7c-5.4%2C4.3-5.6%2C12.5-0.4%2C17.1l15.5%2C15.9c5%2C5.1%2C13.3%2C5.4%2C18.7%2C0.8l109-89.1l108.3%2C89.1c5.4%2C4.6%2C13.7%2C4.3%2C18.7-0.8l15.5-15.9C292.5%2C127.1%2C292.4%2C119%2C287%2C114.7z%22%2F%2F%3E%3C%2Fsvg%3E'); /* Dark Green arrow */
        background-repeat: no-repeat;
        background-position: right 12px center; /* Center vertically */
        background-size: 10px auto; /* Smaller arrow */
        padding-right: 30px; /* Make space for the custom arrow */
        box-sizing: border-box;
      }
      .form-select:focus {
        /* Apply focus style */
        border-color: #386641;
        box-shadow: 0 0 0 4px rgba(56, 102, 65, 0.2);
        outline: none;
      }

      .button-group {
        display: flex;
        justify-content: center;
        gap: 1.5rem; /* More space between dialog buttons */
      }

      .button-group .button-primary,
      .button-group .button-secondary {
        padding: 0.8rem 1.8rem; /* Slightly smaller padding for dialog buttons */
        font-size: 1rem;
        border-radius: 6px;
      }

      /* --- Comments Section --- */
      .comments-section {
        margin-top: 3rem;
        padding-top: 3rem;
        border-top: 1px solid rgba(56, 102, 65, 0.2); /* Subtle green separator */
      }

      .comment-list {
        /* Added a class around your NgFor for comments */
        max-height: 500px; /* Limit height */
        overflow-y: auto; /* Add scroll */
        padding-right: 10px; /* Space for scrollbar */
        margin-bottom: 2rem; /* More space below list */
      }

      /* Style for scrollbar (webkit) */
      .comment-list::-webkit-scrollbar {
        width: 8px;
      }
      .comment-list::-webkit-scrollbar-track {
        background: rgba(56, 102, 65, 0.1); /* Light track using green tint */
        border-radius: 4px;
      }
      .comment-list::-webkit-scrollbar-thumb {
        background: #6a994e; /* Medium Green thumb */
        border-radius: 4px;
      }
      .comment-list::-webkit-scrollbar-thumb:hover {
        background: #386641; /* Dark Green on hover */
      }

      .comment {
        padding: 1.5rem; /* More padding */
        margin-bottom: 2rem; /* More space between comments */
        background: rgba(
          167,
          201,
          87,
          0.1
        ); /* Very light green/yellow tint background */
        border-radius: 8px;
        position: relative; /* For delete button positioning */
        border: 1px solid rgba(56, 102, 65, 0.2); /* Subtle green border */
      }

      .comment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.8rem; /* More space below header */
        font-size: 0.95rem; /* Slightly larger header text */
      }

      .comment-author {
        font-weight: 600;
        color: #386641; /* Dark Green */
      }

      .comment-date {
        color: rgba(56, 102, 65, 0.6); /* Muted dark green */
        font-size: 0.9rem; /* Slightly larger date text */
      }

      .comment-text {
        color: #386641; /* Dark green text */
        line-height: 1.6; /* More space between lines */
        margin-bottom: 1rem; /* Space below text */
      }

      .button-delete {
        background: none;
        /* Using the specific red for deletion */
        border: 1px solid #bc4749; /* Red border */
        color: #bc4749; /* Red text */
        cursor: pointer;
        padding: 0.4rem 0.8rem; /* More padding */
        border-radius: 6px;
        font-size: 0.9rem; /* Slightly larger font */
        transition: background-color 0.2s ease, color 0.2s ease,
          border-color 0.2s ease;
      }

      .button-delete:hover {
        background-color: #bc4749;
        color: white;
        border-color: #a43d40; /* Darker red border */
      }

      .no-comments {
        color: rgba(56, 102, 65, 0.8); /* Muted dark green */
        text-align: center;
        padding: 2rem;
        background: rgba(
          167,
          201,
          87,
          0.1
        ); /* Very light green/yellow tint background */
        border-radius: 8px;
        font-size: 1.1rem;
        border: 1px solid rgba(56, 102, 65, 0.2);
      }

      .add-comment {
        margin-top: 2.5rem;
        padding-top: 2.5rem;
        border-top: 1px solid rgba(56, 102, 65, 0.2); /* Subtle green separator */
      }

      .comment-input {
        width: 100%;
        padding: 1rem 1.2rem; /* Consistent with other inputs */
        border: 1px solid rgba(56, 102, 65, 0.3); /* Subtle green border */
        border-radius: 8px;
        margin-bottom: 1.5rem; /* More space below input */
        resize: vertical;
        background-color: #ffffff; /* White background */
        color: #386641; /* Dark green text */
        font-size: 1rem;
        box-sizing: border-box; /* Include padding in width */
        transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      }

      .comment-input::placeholder {
        color: rgba(56, 102, 65, 0.5); /* Muted dark green placeholder */
      }

      .comment-input:focus {
        /* Apply focus style */
        border-color: #386641;
        box-shadow: 0 0 0 4px rgba(56, 102, 65, 0.2);
        outline: none;
      }

      .add-comment .button-primary {
        /* Style the submit button specifically */
        padding: 1rem 2rem; /* Consistent with main primary button */
        font-size: 1.1rem;
      }

      .add-comment .button-primary:disabled {
        background-color: rgba(56, 102, 65, 0.3); /* Muted green tint */
        color: rgba(255, 255, 255, 0.6); /* Muted white text */
        cursor: not-allowed;
        opacity: 0.7;
        box-shadow: none;
        transform: none;
      }

      /* --- Sidebar Recommendations / Playlist --- */
      .recommendations-list {
        margin-top: 2rem; /* More space below sidebar title */
      }

      .recommendation-card {
        display: flex;
        gap: 1.5rem; /* More space between thumbnail and info */
        margin-bottom: 1.5rem; /* More space between cards */
        padding: 1rem; /* Increased padding */
        border-radius: 8px;
        background: rgba(
          167,
          201,
          87,
          0.1
        ); /* Very light green/yellow tint background */
        transition: background-color 0.2s ease, box-shadow 0.2s ease,
          transform 0.2s ease;
        cursor: pointer;
        align-items: center; /* Vertically center items */
        text-decoration: none; /* Remove underline from RouterLink */
        border: 1px solid rgba(56, 102, 65, 0.2); /* Subtle green border */
      }

      .recommendation-card:hover {
        background: rgba(
          167,
          201,
          87,
          0.3
        ); /* Slightly darker green/yellow tint on hover */
        box-shadow: 0 2px 8px rgba(56, 102, 65, 0.05);
        transform: translateX(5px); /* Subtle slide effect */
      }

      .thumbnail {
        width: 120px; /* Wider thumbnail */
        height: 75px; /* Maintain aspect ratio */
        border-radius: 6px;
        background-size: cover;
        background-position: center;
        flex-shrink: 0; /* Prevent shrinking */
      }

      .course-info {
        flex-grow: 1; /* Allow info to take available space */
      }

      .course-info h4 {
        font-size: 1.05rem; /* Slightly larger title font */
        margin: 0 0 0.6rem 0; /* More space below title */
        color: #386641; /* Dark Green */
        font-weight: 600;
        line-height: 1.4;
      }

      .stats {
        display: flex;
        gap: 1.5rem; /* More space between stats */
        font-size: 0.9rem; /* Slightly larger stats */
        color: rgba(56, 102, 65, 0.6); /* Muted dark green stats color */
      }

      .fallback {
        /* Style for the fallback div if recommendations/playlist is empty */
        color: rgba(56, 102, 65, 0.8); /* Muted dark green */
        text-align: center;
        padding: 2rem;
        background: rgba(
          167,
          201,
          87,
          0.1
        ); /* Very light green/yellow tint background */
        border-radius: 8px;
        font-size: 1.1rem;
        border: 1px solid rgba(56, 102, 65, 0.2);
      }

      /* --- Loading Spinner --- */
      .loading-spinner {
        /* Original class name from your template */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center; /* Center vertically in its space */
        min-height: 400px; /* Ensure it has some height */
        color: rgba(56, 102, 65, 0.8); /* Muted dark green */
        text-align: center;
        font-size: 1.2rem;
        font-weight: 500;
      }

      .spinner {
        width: 60px; /* Larger spinner */
        height: 60px; /* Larger spinner */
        border: 6px solid rgba(56, 102, 65, 0.3); /* Light green border */
        border-top: 6px solid #386641; /* Dark Green spinner */
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1.5rem; /* More space below spinner */
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      /* --- Responsive adjustments --- */
      @media (max-width: 992px) {
        /* Adjust breakpoint */
        .container {
          grid-template-columns: 1fr; /* Stack main and sidebar */
          padding: 0 1.5rem; /* Adjust padding */
          gap: 2rem;
        }

        .sidebar {
          position: static; /* Remove sticky positioning */
          order: -1; /* Place sidebar above detail on mobile */
          max-height: none; /* Remove fixed height */
          overflow-y: visible; /* Remove scroll */
          padding-bottom: 1rem; /* Add padding at bottom */
        }

        .sidebar h3 {
          margin-bottom: 1.5rem; /* Adjust margin */
        }

        .detail-card {
          padding: 2rem; /* Adjust padding */
        }

        h2 {
          /* Course Title */
          font-size: 2.2rem;
          margin-bottom: 1.2rem;
        }

        .course-description {
          font-size: 1rem;
          margin-bottom: 2rem;
        }
        h3 {
          /* Section Titles */
          font-size: 1.6rem;
          margin-bottom: 1.5rem;
        }

        .action-bar {
          flex-direction: column;
          gap: 1rem;
          align-items: stretch; /* Stretch buttons */
          padding: 1rem 0;
        }

        button,
        .button-edit,
        button.button-secondary {
          justify-content: center; /* Center text/icons */
          padding: 0.8rem 1.5rem; /* Adjust button padding */
          font-size: 1rem;
        }

        .button-primary {
          /* Specific adjustment for the add/post buttons */
          padding: 0.8rem 1.5rem;
        }

        .course-meta {
          grid-template-columns: repeat(
            auto-fit,
            minmax(150px, 1fr)
          ); /* Adjust min width */
          gap: 1.5rem;
          padding: 1.5rem;
        }

        .playlist-select {
          /* The modal content */
          padding: 2rem;
        }
        .playlist-select h4 {
          font-size: 1.4rem;
          margin-bottom: 1.5rem;
        }
        .button-group {
          gap: 1rem;
        }
        .button-group button {
          /* Adjust buttons inside group */
          padding: 0.7rem 1.2rem;
          font-size: 0.95rem;
        }

        .comment {
          padding: 1.2rem; /* Adjust padding */
          margin-bottom: 1.5rem;
        }
        .comment-list {
          max-height: 400px; /* Reduce comment list height */
          margin-bottom: 1.5rem;
        }
        .comment-header {
          font-size: 0.9rem;
        }
        .comment-date {
          font-size: 0.85rem;
        }
        .comment-text {
          font-size: 0.95rem;
          margin-bottom: 0.6rem;
        }
        .button-delete {
          padding: 0.3rem 0.6rem;
          font-size: 0.8rem;
        }

        .add-comment {
          margin-top: 2rem;
          padding-top: 2rem;
        }

        .comment-input {
          padding: 0.8rem 1rem;
          font-size: 0.95rem;
          margin-bottom: 1rem;
        }
        .add-comment .button-primary {
          padding: 0.9rem 1.8rem; /* Adjust Post button padding */
          font-size: 1rem;
        }

        .recommendation-card {
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 0.8rem;
        }
        .thumbnail {
          width: 100px;
          height: 60px;
        }
        .course-info h4 {
          font-size: 1rem;
          margin: 0 0 0.4rem 0;
        }
        .stats {
          font-size: 0.85rem;
          gap: 1rem;
        }

        .loading-spinner {
          min-height: 300px;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border-width: 5px;
        }
        .loading-spinner p {
          font-size: 1.1rem;
        }
      }

      @media (max-width: 600px) {
        :host {
          padding: 1rem 0; /* Less padding on very small screens */
        }
        .container {
          padding: 0 0.5rem; /* Less horizontal padding */
          gap: 1.5rem;
        }
        .detail-card,
        .sidebar {
          padding: 1.5rem; /* Less padding inside cards */
          border-radius: 10px;
        }
        h2 {
          font-size: 2rem; /* Slightly smaller */
          margin-bottom: 1rem;
        }
        .course-description {
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        h3 {
          font-size: 1.4rem;
          margin-bottom: 1rem;
        }
        .video-container {
          margin-bottom: 1.5rem;
          border-radius: 6px;
        }
        .course-meta {
          gap: 1rem;
          padding: 1rem;
          margin-bottom: 2rem;
          border-radius: 6px;
        }
        .meta-label {
          font-size: 0.9rem;
          margin-bottom: 0.3rem;
        }
        .meta-value {
          font-size: 0.95rem;
        }
        .action-bar {
          gap: 0.8rem;
          padding: 0.8rem 0;
          margin-bottom: 2rem;
        }
        button,
        .button-edit,
        button.button-secondary {
          padding: 0.7rem 1.2rem;
          font-size: 0.95rem;
          border-radius: 6px;
        }
        .button-like {
          padding: 0.7rem 1.2rem;
          font-size: 0.95rem;
        }
        .button-like span {
          font-size: 1em;
        }
        .button-primary {
          padding: 0.7rem 1.2rem;
          font-size: 0.95rem;
        }

        .playlist-select {
          padding: 1.5rem;
          border-radius: 8px;
        }
        .playlist-select h4 {
          font-size: 1.3rem;
          margin-bottom: 1rem;
        }
        .form-select {
          padding: 0.8rem 1rem;
          font-size: 0.95rem;
          border-radius: 6px;
          background-position: right 8px center;
          background-size: 8px auto;
          padding-right: 25px;
        }
        .button-group {
          gap: 0.8rem;
        }
        .button-group button {
          padding: 0.6rem 1rem;
          font-size: 0.9rem;
          border-radius: 6px;
        }

        .comments-section {
          margin-top: 2rem;
          padding-top: 2rem;
        }
        .comment-list {
          max-height: 350px;
          margin-bottom: 1rem;
          padding-right: 5px;
        }
        .comment {
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 6px;
        }
        .comment-header {
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
        }
        .comment-date {
          font-size: 0.8rem;
        }
        .comment-text {
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        .button-delete {
          padding: 0.2rem 0.5rem;
          font-size: 0.75rem;
          border-radius: 4px;
        }

        .no-comments {
          padding: 1.5rem;
          font-size: 1rem;
          border-radius: 6px;
        }

        .add-comment {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
        }
        .comment-input {
          padding: 0.7rem 0.8rem;
          font-size: 0.9rem;
          margin-bottom: 0.8rem;
          border-radius: 6px;
        }
        .add-comment .button-primary {
          padding: 0.8rem 1.5rem;
          font-size: 0.95rem;
        }

        .recommendations-list {
          margin-top: 1.5rem;
        }
        .recommendation-card {
          flex-direction: column; /* Stack thumbnail and info */
          align-items: flex-start;
          padding: 1rem;
          gap: 0.8rem;
          margin-bottom: 1rem;
          border-radius: 6px;
        }
        .thumbnail {
          width: 100%; /* Full width thumbnail */
          height: 100px; /* Taller thumbnail */
          margin-bottom: 0.6rem;
          border-radius: 4px;
        }
        .course-info h4 {
          font-size: 1rem;
          margin: 0 0 0.4rem 0;
        }
        .stats {
          font-size: 0.85rem;
          gap: 1rem;
        }
        .fallback {
          padding: 1.5rem;
          font-size: 1rem;
          border-radius: 6px;
        }
        .loading-spinner {
          min-height: 250px;
          font-size: 1rem;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border-width: 4px;
          margin-bottom: 1rem;
        }
        .loading-spinner p {
          font-size: 1rem;
        }
      }
    `,
  ],
})
export class CourseDetailComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  course: Course | null = null;
  showPlaylistSelect = false;
  selectedPlaylistId?: number;
  comments: Comment[] = [];
  newCommentText = '';
  isLiked = false;
  currentUserId?: number;
  private hls: Hls | null = null;
  private videoInitialized = false;
  showCreatePlaylistPrompt = false;
  recommendedCourses: Course[] = [];
  recsLoading = true;
  private analyticsBaseUrl = 'http://analytics-service:3005'; // Update with your actual URL
  private http = inject(HttpClient);
  private currentCourseId?: number;

  private courseService = inject(CourseService);
  public playlistService = inject(PlaylistService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  playlistId: number | null = null;
  playlistCourses: Course[] = [];
  playlistLoading = false;
  ngOnInit(): void {
    this.currentUserId = this.authService.currentUser?.id;

    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params: { get: (arg0: string) => any }) => {
          const courseId = Number(params.get('id'));
          return this.loadCourseData(courseId);
        })
      )
      .subscribe({
        next: (course: Course | null) => {
          if (course) {
            this.course = course;
            this.initializeVideoPlayer();
            if (course.id) {
              this.loadComments(course.id);
              this.trackViewAndCheckLikes(course.id);
            }
          }
        },
        error: (err: any) => {
          console.error('Failed to load course', err);
          // Consider redirecting or showing error message
        },
      });
    // NEW QUERY PARAM HANDLING
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params: { [x: string]: any }) => {
        this.playlistId = params['playlistId']
          ? Number(params['playlistId'])
          : null;

        // Load appropriate content based on playlist presence
        if (this.playlistId) {
          this.loadPlaylistCourses();
        } else {
          this.loadRecommendations();
        }
      });
  }

  private loadCourseData(courseId: number): Observable<Course> {
    return this.courseService.getCourse(courseId).pipe(
      filter((course: Course | null): course is Course => course !== null), // Add this line
      tap((course: Course) => {
        this.course = course;
        this.initializeVideoPlayer();
        if (course?.id) {
          this.loadComments(course.id);
          this.trackViewAndCheckLikes(course.id);
        }
      }),
      // Add this to prevent duplicate loading
      takeUntil(this.destroy$)
    );
  }

  private checkRecommendations(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$), take(1))
      .subscribe((params: { [x: string]: any }) => {
        if (!params['playlistId']) {
          this.loadRecommendations();
        }
      });
  }
  private loadPlaylistCourses(): void {
    if (!this.playlistId) return;
    this.playlistLoading = true;

    this.playlistService
      .getPlaylistById(this.playlistId)
      .pipe(
        switchMap((playlist: { courses: any[] }) => {
          const courseEntries = playlist.courses || [];
          const requests = courseEntries.map((entry: any) =>
            this.courseService.getCourse(entry.id).pipe(
              catchError(() => of(null)) // Handle individual course errors
            )
          );
          return forkJoin(requests);
        })
      )
      .subscribe({
        next: (courses: any[]) => {
          this.playlistCourses = courses.filter(
            (course: null) => course !== null
          ) as Course[];
          this.playlistLoading = false;
        },
        error: (err: any) => {
          console.error('Failed to load playlist courses', err);
          this.playlistLoading = false;
        },
      });
  }

  ngAfterViewChecked(): void {
    // Initialize video only once after course data is loaded.
    if (this.course && !this.videoInitialized && this.videoPlayer) {
      this.initializeVideoPlayer();
      this.videoInitialized = true;
    }
  }

  private initializeVideoPlayer(): void {
    if (!this.course?.hls_url || !this.videoPlayer) return;

    // Cleanup existing instance
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    // Initialize new player
    if (Hls.isSupported()) {
      this.hls = new Hls();
      this.hls.loadSource(this.course.hls_url);
      this.hls.attachMedia(this.videoPlayer.nativeElement);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.videoPlayer.nativeElement.play().catch(console.error);
      });
    } else if (
      this.videoPlayer.nativeElement.canPlayType(
        'application/vnd.apple.mpegurl'
      )
    ) {
      this.videoPlayer.nativeElement.src = this.course.hls_url;
    }
    this.videoInitialized = true;
  }

  private trackViewAndCheckLikes(courseId: number): void {
    this.courseService
      .trackCourseView(courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    if (this.currentUserId) {
      this.courseService
        .checkLikeStatus(courseId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (status: { is_liked: boolean; like_count: number }) => {
            this.isLiked = status.is_liked;
            if (this.course) {
              this.course.like_count = status.like_count;
            }
          },
          error: (err: any) =>
            console.error('Failed to check like status', err),
        });
    }
  }
  private loadRecommendations(): void {
    if (!this.currentUserId) {
      this.recommendedCourses = [];
      this.recsLoading = false;
      return;
    }

    this.recsLoading = true;

    this.http
      .get<{ recommendations: number[] }>(
        `/analytics/recommendations/${this.currentUserId}`
      )
      .pipe(
        switchMap((response: { recommendations: number[] }) => {
          const courseIds = response.recommendations || [];
          // If empty, try random courses
          if (courseIds.length === 0) {
            return this.courseService
              .getRandomCourses()
              .pipe(catchError(() => of([] as number[])));
          }
          return of(courseIds);
        }),
        switchMap((ids: any[]) => {
          // If still empty after fallbacks, show empty state
          if (ids.length === 0) return of([] as Course[]);

          return forkJoin(
            ids.map((id: number) =>
              this.courseService.getCourse(id).pipe(
                catchError(() => of(null)),
                // Add timeout for safety
                timeout(5000)
              )
            )
          ).pipe(
            map(
              (courses: any[]) =>
                courses.filter((c: null) => c !== null) as Course[]
            )
          );
        }),
        catchError((err: any) => {
          console.error('Recommendations error:', err);
          return of([] as Course[]);
        })
      )
      .subscribe({
        next: (courses: Course[]) => {
          this.recommendedCourses = courses;
          this.recsLoading = false;
        },
        error: (err: any) => {
          this.recommendedCourses = [];
          this.recsLoading = false;
        },
      });
  }
  canEdit(): boolean {
    const user = this.authService.currentUser;
    if (!user || !this.course) return false;

    return (
      this.authService.hasRole('admin') ||
      (this.authService.hasRole('teacher') &&
        user.id === this.course.teacher_id)
    );
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  addToPlaylist(): void {
    this.showPlaylistSelect = true;

    this.playlistService.loadUserPlaylists().subscribe({
      next: () => {
        if (this.playlistService.playlists().length === 0) {
          // Show create playlist prompt
          this.showCreatePlaylistPrompt = true;
        }
      },
      error: (err: any) => console.error('Failed to load playlists', err),
    });
  }

  confirmAdd(): void {
    console.log('confirmAdd called');
    console.log('selectedPlaylistId:', this.selectedPlaylistId);
    console.log('course object:', this.course); // Log the whole object
    console.log('course ID being sent:', this.course?.id); // Use optional chaining here
    if (this.selectedPlaylistId && this.course) {
      this.playlistService
        .addCourseToPlaylist(this.selectedPlaylistId, this.course.id)
        .subscribe({
          next: () => {
            console.log('Course added successfully');
            this.showPlaylistSelect = false;
            this.selectedPlaylistId = undefined;
          },
          error: (err: any) =>
            console.error('Failed to add course to playlist', err), // Check this error log too
        });
    } else {
      console.warn(
        'Cannot add course: Playlist or Course not selected/loaded.'
      );
    }
  }

  cancelAdd(): void {
    this.showPlaylistSelect = false;
    this.selectedPlaylistId = undefined;
  }

  // -------------------------
  // Like / Unlike Methods
  // -------------------------
  toggleLike(): void {
    if (!this.course || !this.currentUserId) return;

    const originalState = this.isLiked;
    const originalCount = this.course.like_count || 0;

    // Optimistic update
    this.isLiked = !this.isLiked;
    this.course.like_count = this.isLiked
      ? originalCount + 1
      : originalCount - 1;

    const observable = this.isLiked
      ? this.courseService.likeCourse(this.course.id)
      : this.courseService.unlikeCourse(this.course.id);

    observable.subscribe({
      next: (res: any) => {
        // Final update from server
        this.isLiked = res.is_liked;
        this.course!.like_count = res.like_count;
      },
      error: (err: any) => {
        // Rollback on error
        this.isLiked = originalState;
        this.course!.like_count = originalCount;
        console.error('Like operation failed', err);
      },
    });
  }

  // -------------------------
  // Comments Methods
  // -------------------------
  // In course-detail.component.ts
  loadComments(courseId: number): void {
    this.courseService.getComments(courseId).subscribe({
      next: (comments: Comment[]) => {
        // Create new array reference to force change detection
        this.comments = [...comments];
      },
      error: (err: any) => console.error('Failed to load comments', err),
    });
  }

  // course-detail.component.ts
  submitComment(): void {
    if (!this.course || !this.newCommentText.trim()) return;

    // Get current user data
    const currentUser = this.authService.currentUser!;

    // Create temporary comment with known data
    const tempComment: Comment = {
      id: Date.now(), // Unique temporary ID
      text: this.newCommentText.trim(),
      user_id: currentUser.id,
      user_email: currentUser.email,
      created_at: new Date().toISOString(),
      user_role: currentUser.role,
    };

    // Optimistically update UI
    this.comments = [...this.comments, tempComment];
    this.newCommentText = '';

    // Submit to backend
    this.courseService.addComment(this.course.id, tempComment.text).subscribe({
      next: (serverComment: any) => {
        // Replace temporary comment with server response
        this.comments = this.comments.map((c) =>
          c.id === tempComment.id ? serverComment : c
        );
      },
      error: (err: any) => {
        // Remove temporary comment on error
        this.comments = this.comments.filter((c) => c.id !== tempComment.id);
        console.error('Failed to add comment', err);
      },
    });
  }

  deleteComment(commentId: number): void {
    this.courseService.deleteComment(commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter((c) => c.id !== commentId);
      },
      error: (err: any) => console.error('Failed to delete comment', err),
    });
  }
}
