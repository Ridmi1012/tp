import { Component } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule , MatDialogRef} from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-admin-confirm-dialog',
  imports: [ CommonModule, 
    FormsModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatInputModule,
    MatFormFieldModule],
  templateUrl: './admin-confirm-dialog.component.html',
  styleUrl: './admin-confirm-dialog.component.css'
})
export class AdminConfirmDialogComponent {
  constructor(
    private datePipe: DatePipe,
    public dialogRef: MatDialogRef<AdminConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

}
