import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DesignService } from '../../../services/design.service';
import { Design } from '../../../services/design.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admindesingsportfolio',
  imports: [CommonModule, FormsModule],
  templateUrl:'./admindesingsportfolio.component.html',
  styleUrl: './admindesingsportfolio.component.css'
})
export class AdmindesingsportfolioComponent {

  designs: Design[] = [];
  errorMessage: string = '';
  successMessage: string = '';
  showDeleteConfirm: boolean = false;
  designToDelete: Design | null = null;

  constructor(
    private designService: DesignService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadDesigns();
  }

  loadDesigns() {
    this.designService.getAllDesigns().subscribe({
      next: (data: Design[]) => {
        this.designs = data;
        this.errorMessage = '';
      },
      error: (err: any) => {
        console.error('Error loading designs', err);
        this.errorMessage = 'Failed to load designs. Please try again.';
      }
    });
  }

  onImageError(event: any): void {
    event.target.src = '/assets/placeholder-image.png';
  }

  addNewDesign() {
    this.router.navigate(['/manage-portfolio']);
  }

  editDesign(id: number) {
    this.router.navigate(['/edit-design', id]);
  }

  confirmDelete(design: Design) {
    this.designToDelete = design;
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.designToDelete = null;
  }

  deleteDesign() {
    if (this.designToDelete) {
      const id = this.designToDelete.designID;
      this.designService.deleteDesign(id).subscribe({
        next: () => {
          this.designs = this.designs.filter(design => design.designID !== id);
          this.successMessage = 'Design deleted successfully!';
          this.showDeleteConfirm = false;
          this.designToDelete = null;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err: any) => {
          console.error('Error deleting design', err);
          this.errorMessage = 'Failed to delete design. Please try again.';
          this.showDeleteConfirm = false;
          this.designToDelete = null;
        }
      });
    }
  }
}
