import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DesignService } from '../../services/design.service';
import { CategoryService, Category, CategoryRequest } from '../../services/category.service';
import { ItemService, Item, ItemRequest } from '../../services/item.service';
import { Router } from '@angular/router';
import { CloudinaryserviceService } from '../../services/cloudinaryservice.service';

interface SelectedItem {
  itemId: number;
  quantity: number;
  price: number;
}


@Component({
  selector: 'app-manageportfolio',
  imports: [CommonModule, FormsModule],
  templateUrl: './manageportfolio.component.html',
  styleUrl: './manageportfolio.component.css'
})
export class ManageportfolioComponent implements OnInit {

  steps = [
    { title: 'Basic Information', description: 'Add thumbnail, title and category' },
    { title: 'Item Selection', description: 'Choose items to include in your design' },
    { title: 'Price Summary', description: 'Review the calculated price' },
    { title: 'Additional Images', description: 'Upload additional images (optional)' }
  ];
  currentStep = 0;

  designs: any[] = [];
  categories: Category[] = [];
  items: Item[] = [];
  filteredItems: Item[] = [];
  selectedItemsWithQty: SelectedItem[] = [];

  // Separate main thumbnail from additional images
  thumbnailFile: File | null = null;
  thumbnailPreviewUrl: string = '';
  mainImageSelected: boolean = false;

  additionalImages: File[] = [];
  additionalImagePreviewUrls: string[] = [];

  errorMessage: string = '';
  successMessage: string = '';
  isUploading: boolean = false;
  itemSearchQuery: string = '';
  calculatedPrice: number = 0;

  formData = {
    title: '',
    category: '',
    description: '',
    price: 0,
    includedItems: ''
  };

  constructor(
    private designService: DesignService,
    private categoryService: CategoryService,
    private itemService: ItemService,
    private cloudinaryService: CloudinaryserviceService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    this.loadItems();
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      // Validate current step before proceeding
      if (this.validateCurrentStep()) {
        this.currentStep++;
      }
    }
  }

  validateCurrentStep(): boolean {
    // Validate based on the current step
    switch (this.currentStep) {
      case 0: // Basic Information
        if (!this.formData.title.trim()) {
          this.errorMessage = 'Please enter a design title.';
          return false;
        }
        if (!this.formData.category) {
          this.errorMessage = 'Please select a category.';
          return false;
        }
        if (!this.thumbnailFile) {
          this.errorMessage = 'Please select a thumbnail image.';
          return false;
        }
        return true;
      
      case 1: // Item Selection
        if (this.selectedItemsWithQty.length === 0) {
          this.errorMessage = 'Please select at least one item.';
          return false;
        }
        return true;
      
      case 2: // Price Summary
        // Price is calculated automatically, nothing to validate
        return true;
      
      default:
        return true;
    }
  }
  
  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (data: Category[]) => {
        this.categories = data;
      },
      error: (err: any) => {
        console.error('Error loading categories', err);
        this.errorMessage = 'Failed to load categories. Please try again.';
      }
    });
  }

  loadItems() {
    this.itemService.getItems().subscribe({
      next: (data: Item[]) => {
        this.items = data;
        this.filteredItems = [...this.items];
      },
      error: (err: any) => {
        console.error('Error loading items', err);
        this.errorMessage = 'Failed to load items. Please try again.';
      }
    });
  }

  onImageError(event: any): void {
    event.target.src = '/assets/placeholder-image.png';
  }

  // Handle thumbnail (main image) upload
  onThumbnailChange(event: any) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'File size exceeds 5MB. Please choose a smaller image.';
        event.target.value = '';
        return;
      }

      // Check file type
      if (!file.type.match('image.*')) {
        this.errorMessage = 'Only image files are allowed.';
        event.target.value = '';
        return;
      }

      this.thumbnailFile = file;
      this.mainImageSelected = true;

      // Create preview URL for instant display
      const reader = new FileReader();
      reader.onload = () => {
        this.thumbnailPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeThumbnail(): void {
    this.thumbnailFile = null;
    this.thumbnailPreviewUrl = '';
    this.mainImageSelected = false;
  }

  // Handle additional images upload
  onAdditionalImagesChange(event: any) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'File size exceeds 5MB. Please choose a smaller image.';
        event.target.value = '';
        return;
      }

      // Check file type
      if (!file.type.match('image.*')) {
        this.errorMessage = 'Only image files are allowed.';
        event.target.value = '';
        return;
      }

      // Add to the array if we have space
      if (this.additionalImages.length < 2) {
        this.additionalImages.push(file);

        // Create and add preview URL
        const reader = new FileReader();
        reader.onload = () => {
          this.additionalImagePreviewUrls.push(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        this.errorMessage = 'Maximum of 2 additional images allowed.';
      }
    }
  }

  removeAdditionalImage(index: number): void {
    this.additionalImages.splice(index, 1);
    this.additionalImagePreviewUrls.splice(index, 1);
  }

  isFormValid(): boolean {
    // Check if title is provided and not just whitespace
    if (!this.formData.title.trim()) {
      return false;
    }

    // Check if category is selected
    if (!this.formData.category) {
      return false;
    }

    // Check if thumbnail image is selected
    if (!this.thumbnailFile) {
      return false;
    }

    // Check if at least one item is selected
    if (this.selectedItemsWithQty.length === 0) {
      return false;
    }

    return true;
  }

  searchItems() {
    if (this.itemSearchQuery.trim() === '') {
      this.filteredItems = [...this.items];
      return;
    }

    this.filteredItems = this.items.filter(item =>
      item.name.toLowerCase().includes(this.itemSearchQuery.toLowerCase())
    );
  }

  // Modified to increment quantity if item already exists and update price
  addItem(item: Item) {
    // Check if the item is already in the list
    const existingItem = this.selectedItemsWithQty.find(selected => selected.itemId === item.itemID);

    if (existingItem) {
      // Increment quantity if item already exists
      existingItem.quantity += 1;
    } else {
      // Add new item with quantity 1
      this.selectedItemsWithQty.push({
        itemId: item.itemID,
        quantity: 1,
        price: item.unitPrice
      });
    }

    // Recalculate the total price
    this.calculateTotalPrice();
  }

  getItemName(itemId: number): string {
    const item = this.items.find(i => i.itemID === itemId);
    return item ? item.name : 'Unknown Item';
  }

  getItemPrice(itemId: number): number {
    const item = this.items.find(i => i.itemID === itemId);
    return item ? item.unitPrice : 0;
  }

  validateItemQuantity(selection: SelectedItem): void {
    // Ensure quantity is at least 1
    if (selection.quantity < 1) {
      selection.quantity = 1;
      this.errorMessage = 'Quantity must be at least 1.';
      setTimeout(() => this.errorMessage = '', 3000);
    }

    // Recalculate the total price
    this.calculateTotalPrice();
  }

  removeSelectedItem(itemId: number): void {
    // Find the index of the item to remove
    const index = this.selectedItemsWithQty.findIndex(item => item.itemId === itemId);
    if (index !== -1) {
      this.selectedItemsWithQty.splice(index, 1);
      // Recalculate the total price
      this.calculateTotalPrice();
    }
  }

  calculateTotalPrice(): void {
    let total = 0;

    // Calculate based on all selected items and their quantities
    for (const item of this.selectedItemsWithQty) {
      const itemPrice = this.getItemPrice(item.itemId);
      total += itemPrice * item.quantity;
    }

    // Update both the calculated price and the form data price
    this.calculatedPrice = total;
    this.formData.price = total;
  }

  submit() {
    if (!this.isFormValid()) {
      if (!this.formData.title.trim()) {
        this.errorMessage = 'Please enter a design title.';
      } else if (!this.formData.category) {
        this.errorMessage = 'Please select a category.';
      } else if (!this.thumbnailFile) {
        this.errorMessage = 'Please select a thumbnail image.';
      } else if (this.selectedItemsWithQty.length === 0) {
        this.errorMessage = 'Please select at least one item.';
      } else {
        this.errorMessage = 'Please fill all required fields.';
      }
      return;
    }

    // Find the category ID from the selected category name
    const selectedCategory = this.categories.find(cat => cat.name === this.formData.category);
    if (!selectedCategory) {
      this.errorMessage = 'Invalid category selected.';
      return;
    }

    // Start with thumbnail image
    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = 'Uploading images...';

    // Prepare all images for upload
    const allImages: File[] = [];
    if (this.thumbnailFile) {
      allImages.push(this.thumbnailFile);
    }
    allImages.push(...this.additionalImages);

    // We'll need to upload all images to Cloudinary
    const imageUploadPromises: Promise<string>[] = [];

    for (const file of allImages) {
      const promise = new Promise<string>((resolve, reject) => {
        this.cloudinaryService.uploadImage(file).subscribe({
          next: (response) => resolve(response.secure_url),
          error: (err) => reject(err)
        });
      });

      imageUploadPromises.push(promise);
    }

    // After all images are uploaded
    Promise.all(imageUploadPromises)
      .then(imageUrls => {
        this.isUploading = false;
        this.successMessage = 'Images uploaded successfully, saving design...';

        // First URL is the main thumbnail, the rest are additional
        const mainImageUrl = imageUrls[0];
        const additionalImageUrls = imageUrls.slice(1);

        this.createDesignWithImages(selectedCategory.categoryID, this.selectedItemsWithQty, mainImageUrl, additionalImageUrls);
      })
      .catch(err => {
        this.isUploading = false;
        console.error('Error uploading images to Cloudinary', err);
        this.errorMessage = 'Failed to upload one or more images. Please try again.';
      });
  }

  createDesignWithImages(categoryId: number, selectedItemsData: SelectedItem[], mainImageUrl: string, additionalImageUrls: string[]) {
    // Map selected items with quantities to the format expected by the API
    const itemsForRequest = selectedItemsData.map(selection => ({
      itemId: selection.itemId,
      defaultQuantity: selection.quantity,
      isOptional: false
    }));

    // Create the design request object
    const designRequest = {
      name: this.formData.title,
      categoryId: categoryId,
      basePrice: this.formData.price,
      description: this.formData.description || '',
      imageUrl: mainImageUrl,
      additionalImages: additionalImageUrls,
      createdBy: 1, // You might want to get this from a user service
      items: itemsForRequest
    };

    // Prepare the form data
    const formData = this.designService.prepareFormData(designRequest);

    this.designService.addDesign(formData).subscribe({
      next: (response: any) => {
        console.log('Design added successfully:', response);
        // Reset form
        this.formData = {
          title: '',
          category: '',
          description: '',
          price: 0,
          includedItems: ''
        };
        this.selectedItemsWithQty = [];
        this.thumbnailFile = null;
        this.thumbnailPreviewUrl = '';
        this.mainImageSelected = false;
        this.additionalImages = [];
        this.additionalImagePreviewUrls = [];
        this.calculatedPrice = 0;
        this.errorMessage = '';
        this.successMessage = 'Design added successfully!';
        setTimeout(() => this.successMessage = '', 3000);

        // Navigate to the admin portfolio page
        this.router.navigate(['/admin-portfolio']);
      },
      error: (err: any) => {
        console.error('Error adding design', err);
        this.errorMessage = 'Failed to add design: ' + (err.error?.message || err.message);
      }
    });
  }
}
