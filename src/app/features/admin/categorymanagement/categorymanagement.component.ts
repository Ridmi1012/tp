import { Component, OnInit} from '@angular/core';
import {CategoryService, Category, CategoryRequest} from '../../../services/category.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  constructor(private categoryService: CategoryService) {}

  ngOnInit(): void {
    this.fetchCategories();
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
        this.errorMessage = error.error?.message || 'Failed to add category. Please try again.';
      }
    });
  }

  startEdit(category: Category): void {
    this.editingCategory = { ...category };
    this.showEditSection = true;
  }

  cancelEdit(): void {
    this.editingCategory = {} as Category;
    this.showEditSection = false;
  }

  updateCategory(): void {
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
        this.errorMessage = error.error?.message || 'Failed to update category.';
      }
    });
  }

  deleteCategory(id: number): void {
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
          this.errorMessage = error.error?.message || 'Failed to delete category.';
        }
      });
    }
  }
}
