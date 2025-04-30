import { Component, OnInit, OnDestroy } from '@angular/core';
import { ItemService } from '../../../services/item.service';
import { Item, ItemRequest } from '../../../services/item.service';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

interface DisplayItem {
  itemID: number;
  name: string;
  price: number;
  description: string;
}

@Component({
  selector: 'app-itemmanagement',
  imports: [CommonModule, FormsModule],
  templateUrl: './itemmanagement.component.html',
  styleUrl: './itemmanagement.component.css'
})
export class ItemmanagementComponent implements OnInit, OnDestroy {
  items: DisplayItem[] = [];
  filteredItems: DisplayItem[] = [];
  searchText: string = '';
  loading: boolean = false;
  error: string | null = null;
  isAdmin: boolean = false;
  
  // Track authentication changes
  private authSubscription?: Subscription;
  
  newItem = {
    name: '',
    price: 0,
    description: ''
  };
  
  editedItem = {
    itemID: 0,
    name: '',
    price: 0,
    description: ''
  };
  
  showEditModal: boolean = false;
  currentEditIndex: number = -1;

  constructor(
    private itemService: ItemService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Check if user is admin
    this.isAdmin = this.authService.isAdmin();
    
    // Subscribe to auth changes
    this.authSubscription = this.authService.authChange.subscribe(isAuthenticated => {
      this.isAdmin = isAuthenticated && this.authService.isAdmin();
      
      // If user is no longer authenticated, redirect to login
      if (!isAuthenticated) {
        this.router.navigate(['/login'], { 
          queryParams: { returnUrl: '/admin/items' }
        });
      }
    });
    
    // Fetch items (everyone can view)
    this.fetchItems();
    
    // Alert non-admin users that they can only view items
    if (!this.isAdmin) {
      setTimeout(() => {
        alert('You are viewing items in read-only mode. Admin privileges are required to add, edit, or delete items.');
      }, 500);
    }
  }
  
  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  fetchItems(): void {
    this.loading = true;
    this.error = null;
    
    this.itemService.getItems().subscribe({
      next: (data) => {
        console.log('Items fetched successfully:', data);
        // Convert the API item format to our component format
        this.items = data.map(item => ({
          itemID: item.itemID,
          name: item.name,
          price: item.unitPrice,
          description: item.description || ''
        }));
        this.filteredItems = [...this.items];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching items:', error);
        this.error = 'Failed to load items. Please try again later.';
        this.loading = false;
        
        // If unauthorized, redirect to login
        if (error.status === 401 || error.status === 403) {
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: '/admin/items' }
          });
        }
      }
    });
  }

  filterItems(): void {
    this.filteredItems = this.items.filter(item => {
      return this.searchText ? 
        item.name.toLowerCase().includes(this.searchText.toLowerCase()) : 
        true;
    });
  }

  addItem(): void {
    // Check if user is admin
    if (!this.isAdmin) {
      alert('You do not have permission to add items. Admin privileges are required.');
      return;
    }
    
    console.log('Starting addItem with values:', this.newItem);
    
    if (!this.newItem.name) {
      alert('Item name is required');
      return;
    }
    
    // Ensure price is never null and is a proper number
    const price = (typeof this.newItem.price === 'number' && !isNaN(this.newItem.price)) 
      ? this.newItem.price 
      : 0;
      
    console.log('Processed price:', price, 'type:', typeof price);
    
    const apiItem: ItemRequest = {
      name: this.newItem.name,
      description: this.newItem.description || '',
      unitPrice: price,
    };
  
    console.log('API item prepared:', apiItem);
    
    this.itemService.addItem(apiItem).subscribe({
      next: (response) => {
        console.log('Success response:', response);
        // Add new item to our local array
        const newDisplayItem: DisplayItem = {
          itemID: response.itemID,
          name: response.name,
          price: response.unitPrice,
          description: response.description || ''
        };
        
        this.items.push(newDisplayItem);
        this.filterItems();
        
        // Reset form
        this.newItem = {
          name: '',
          price: 0,
          description: ''
        };
      },
      error: (error) => {
        console.error('Error details:', error);
        if (error.status === 403) {
          alert('You do not have permission to add items. Admin privileges are required.');
        } else {
          alert('Failed to add item. Please make sure all required fields are filled correctly.');
        }
      }
    });
  }

  editItem(index: number): void {
    // Check if user is admin
    if (!this.isAdmin) {
      alert('You do not have permission to edit items. Admin privileges are required.');
      return;
    }
    
    const item = this.filteredItems[index];
    this.editedItem = { ...item };
    this.currentEditIndex = index;
    this.showEditModal = true;
  }

  cancelEdit(): void {
    this.showEditModal = false;
    this.currentEditIndex = -1;
  }

  updateItem(): void {
    // Check if user is admin
    if (!this.isAdmin) {
      alert('You do not have permission to update items. Admin privileges are required.');
      this.showEditModal = false;
      this.currentEditIndex = -1;
      return;
    }
    
    const originalItem = this.filteredItems[this.currentEditIndex];
    
    // Convert to API format
    const apiItem: ItemRequest = {
      name: this.editedItem.name,
      description: this.editedItem.description,
      unitPrice: this.editedItem.price,
    };

    this.itemService.updateItem(originalItem.itemID, apiItem).subscribe({
      next: () => {
        // Update in our local array
        const itemIndex = this.items.findIndex(i => i.itemID === originalItem.itemID);
        if (itemIndex !== -1) {
          this.items[itemIndex] = { ...this.editedItem };
        }
        
        this.showEditModal = false;
        this.filterItems();
      },
      error: (error) => {
        console.error('Error updating item:', error);
        if (error.status === 403) {
          alert('You do not have permission to update items. Admin privileges are required.');
        } else {
          alert('Failed to update item. Please try again.');
        }
      }
    });
  }

  deleteItem(index: number): void {
    // Check if user is admin
    if (!this.isAdmin) {
      alert('You do not have permission to delete items. Admin privileges are required.');
      return;
    }
    
    const item = this.filteredItems[index];
    
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      this.itemService.deleteItem(item.itemID).subscribe({
        next: () => {
          // Remove from our local array
          this.items = this.items.filter(i => i.itemID !== item.itemID);
          this.filterItems();
        },
        error: (error) => {
          console.error('Error deleting item:', error);
          if (error.status === 403) {
            alert('You do not have permission to delete items. Admin privileges are required.');
          } else {
            alert('Failed to delete item. Please try again.');
          }
        }
      });
    }
  }
}