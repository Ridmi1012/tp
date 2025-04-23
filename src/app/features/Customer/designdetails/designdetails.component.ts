import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DesignService } from '../../../services/design.service';
import { Design } from '../../../services/design.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-designdetails',
  imports: [CommonModule, RouterModule],
  templateUrl: './designdetails.component.html',
  styleUrl: './designdetails.component.css'
})
export class DesigndetailsComponent implements OnInit {
  design: Design | null = null;
  loading: boolean = true;
  error: string = '';
  selectedImage: string = '';

  constructor(
    private designService: DesignService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDesign(+id);
    } else {
      this.error = 'Design ID not provided';
      this.loading = false;
    }
  }

  loadDesign(id: number): void {
    this.loading = true;
    this.designService.getDesignById(id).subscribe({
      next: (data: Design) => {
        this.design = data;
        this.selectedImage = data.imageUrl;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading design', err);
        this.error = 'Failed to load design details. Please try again.';
        this.loading = false;
      }
    });
  }

  onImageError(event: any): void {
    event.target.src = '/assets/placeholder-image.png';
  }

  setSelectedImage(imageUrl: string): void {
    this.selectedImage = imageUrl;
  }

  orderAsIs(): void {
    if (this.design) {
      this.router.navigate(['/order', this.design.designID, 'as-is']);
    }
  }

  customizeDesign(): void {
    if (this.design) {
      this.router.navigate(['/customize', this.design.designID]);
    }
  }

  requestSimilarDesign(): void {
    if (this.design) {
      this.router.navigate(['/customize', this.design.designID, 'similar']);
    }
  }

  goBack(): void {
    this.router.navigate(['/portfolio']);
  }

}
