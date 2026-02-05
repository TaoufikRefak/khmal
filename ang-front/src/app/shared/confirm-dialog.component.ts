import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  template: `
    <div class="dialog-container">
      <h2>{{ data.title }}</h2>
      <p>{{ data.message }}</p>
      <div class="dialog-actions">
        <button (click)="onNoClick()">Cancel</button>
        <button (click)="onYesClick()">Confirm</button>
      </div>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        padding: 20px;
        background: white;
        border-radius: 8px;
      }
      .dialog-actions {
        margin-top: 20px;
        display: flex;
        gap: 10px;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string }
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
}
