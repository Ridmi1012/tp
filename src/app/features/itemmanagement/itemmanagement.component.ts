import { Component, OnInit } from '@angular/core';
import { ItemService } from '../../services/item.service';
import { Item, ItemRequest } from '../../services/item.service';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { CategoryService, Category } from '../../services/category.service';

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
export class ItemmanagementComponent implements OnInit {
  items: DisplayItem[] = [];
  filteredItems: DisplayItem[] = [];
  searchText: string = '';
  
  newItem = {
    name: '',
    price: 0,
    unitPrice: 0,
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
    private itemService: ItemService
  ) { }

  ngOnInit(): void {
    this.fetchItems();
  }

  fetchItems(): void {
    this.itemService.getItems().subscribe({
      next: (data) => {
        // Convert the API item format to our component format
        this.items = data.map(item => ({
          itemID: item.itemID,
          name: item.name,
          price: item.unitPrice,
          description: item.description
        }));
        this.filteredItems = [...this.items];
      },
      error: (error) => {
        console.error('Error fetching items:', error);
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
          description: response.description
        };
        
        this.items.push(newDisplayItem);
        this.filterItems();
        
        // Reset form
        this.newItem = {
          name: '',
          price: 0,
          unitPrice: 0,
          description: ''
        };
      },
      error: (error) => {
        console.error('Error details:', error);
        alert('Failed to add item. Please make sure all required fields are filled correctly.');
      }
    });
  }

  editItem(index: number): void {
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
      }
    });
  }

  deleteItem(index: number): void {
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
        }
      });
    }
  }
}
