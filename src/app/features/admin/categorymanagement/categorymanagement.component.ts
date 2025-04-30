import { Component, OnInit} from '@angular/core';
import {CategoryService, Category, CategoryRequest} from '../../../services/category.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-categorymanagement',
  imports: [CommonModule, FormsModule],
  templateUrl: './categorymanagement.component.html',
  styleUrl: './categorymanagement.component.css'
})
export class CategorymanagementComponent implements OnInit {
  categories: Category[] = [];
  newCategory: CategoryRequest = { name: '', description: '' };
  editingCategory: Category = {} as Category; 
  errorMessage: string = '';
  successMessage: string = '';
  showEditSection: boolean = false;
  isAdmin: boolean = false;
  
  // Track authentication changes
  private authSubscription?: Subscription;

  constructor(
    private categoryService: CategoryService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: '/admin/categories' }
      });
      return;
    }
    
    // Check if user is admin
    this.isAdmin = this.authService.isAdmin();
    
    // Subscribe to auth changes
    this.authSubscription = this.authService.authChange.subscribe(isAuthenticated => {
      this.isAdmin = isAuthenticated && this.authService.isAdmin();
      
      // If user is no longer authenticated, redirect to login
      if (!isAuthenticated) {
        this.router.navigate(['/login'], { 
          queryParams: { returnUrl: '/admin/categories' }
        });
      }
    });
    
    // Fetch categories (everyone can view)
    this.fetchCategories();
    
    // Alert non-admin users that they can only view categories
    if (!this.isAdmin) {
      setTimeout(() => {
        alert('You are viewing categories in read-only mode. Admin privileges are required to add, edit, or delete categories.');
      }, 500);
    }
  }
  
  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
  
  fetchCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('Error fetching categories:', error);
        this.errorMessage = 'Failed to load categories. Please try again.';
      }
    });
  }

  addCategory(): void {
    // Check if user is admin
    if (!this.isAdmin) {
      this.errorMessage = 'You do not have permission to add categories. Admin privileges are required.';
      return;
    }
    
    if (!this.newCategory.name.trim()) {
      this.errorMessage = 'Category name is required';
      return;
    }

    this.categoryService.addCategory(this.newCategory).subscribe({
      next: () => {
        this.fetchCategories();
        this.newCategory = { name: '', description: '' };
        this.successMessage = 'Category added successfully!';
        this.errorMessage = '';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error adding category:', error);
        this.errorMessage = error.message || 'Failed to add category. Please try again.';
      }
    });
  }

  startEdit(category: Category): void {
    // Check if user is admin
    if (!this.isAdmin) {
      this.errorMessage = 'You do not have permission to edit categories. Admin privileges are required.';
      return;
    }
    
    this.editingCategory = { ...category };
    this.showEditSection = true;
  }

  cancelEdit(): void {
    this.editingCategory = {} as Category;
    this.showEditSection = false;
  }

  updateCategory(): void {
    // Check if user is admin
    if (!this.isAdmin) {
      this.errorMessage = 'You do not have permission to update categories. Admin privileges are required.';
      this.showEditSection = false;
      return;
    }
    
    if (!this.editingCategory || !this.editingCategory.categoryID) {
      this.errorMessage = 'Invalid category data';
      return;
    }

    const updateRequest: CategoryRequest = {
      name: this.editingCategory.name,
      description: this.editingCategory.description,
    };

    this.categoryService.updateCategory(this.editingCategory.categoryID, updateRequest).subscribe({
      next: () => {
        this.fetchCategories();
        this.cancelEdit();
        this.successMessage = 'Category updated successfully!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error updating category:', error);
        this.errorMessage = error.message || 'Failed to update category.';
      }
    });
  }

  deleteCategory(id: number): void {
    // Check if user is admin
    if (!this.isAdmin) {
      this.errorMessage = 'You do not have permission to delete categories. Admin privileges are required.';
      return;
    }
    
    if (confirm('Are you sure you want to delete this category?')) {
      this.categoryService.deleteCategory(id).subscribe({
        next: () => {
          this.fetchCategories();
          this.successMessage = 'Category deleted successfully!';
          this.errorMessage = '';
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error deleting category:', error);
          this.errorMessage = error.message || 'Failed to delete category.';
        }
      });
    }
  }
}
