import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DesignService, Design } from '../../../services/design.service';
import { CategoryService, Category } from '../../../services/category.service';
import { ItemService, Item } from '../../../services/item.service';
import { CloudinaryserviceService } from '../../../services/cloudinaryservice.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';



interface SelectedItem {
  itemId: number;
  quantity: number;
  price: number;
}

@Component({
  selector: 'app-admin-edit-design',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-edit-design.component.html',
  styleUrl: './admin-edit-design.component.css'
})
export class AdminEditDesignComponent implements OnInit, OnDestroy{
  
  steps = [
    { title: 'Basic Information', description: 'Edit thumbnail, title and category' },
    { title: 'Item Selection', description: 'Modify items included in your design' },
    { title: 'Price Summary', description: 'Review the calculated price' },
    { title: 'Additional Images', description: 'Update additional images (optional)' }
  ];
  currentStep = 0;

  designId: number = 0;
  existingDesign: Design | null = null;
  categories: Category[] = [];
  items: Item[] = [];
  filteredItems: Item[] = [];
  selectedItemsWithQty: SelectedItem[] = [];
  isAdmin: boolean = false;

  // Track authentication changes
  private authSubscription?: Subscription;

  // Image handling
  thumbnailFile: File | null = null;
  thumbnailPreviewUrl: string = '';
  mainImageSelected: boolean = false;
  currentThumbnailUrl: string = '';
  thumbnailChanged: boolean = false;

  additionalImages: File[] = [];
  additionalImagePreviewUrls: string[] = [];
  currentAdditionalImageUrls: string[] = [];
  additionalImagesChanged: boolean = false;

  errorMessage: string = '';
  successMessage: string = '';
  isUploading: boolean = false;
  isLoading: boolean = true;
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
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Check if user is admin
    this.isAdmin = this.authService.isAdmin();
    
    if (!this.isAdmin) {
      alert('You do not have permission to edit designs. Admin privileges are required.');
      this.router.navigate(['/unauthorized']);
      return;
    }
    
    // Subscribe to auth changes
    this.authSubscription = this.authService.authChange.subscribe(isAuthenticated => {
      this.isAdmin = isAuthenticated && this.authService.isAdmin();
      
      if (!isAuthenticated || !this.isAdmin) {
        this.router.navigate(['/login']);
      }
    });
    
    // Get design ID from route params
    this.route.params.subscribe(params => {
      this.designId = +params['id'];
      this.loadDesignData();
    });
    
    this.loadCategories();
    this.loadItems();
  }
  
  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  loadDesignData(): void {
    this.designService.getDesignById(this.designId).subscribe({
      next: (design: Design) => {
        this.existingDesign = design;
        
        // Populate form data
        this.formData.title = design.name;
        this.formData.category = design.category.name;
        this.formData.description = design.description || '';
        this.formData.price = design.basePrice;
        
        // Set current thumbnail
        this.currentThumbnailUrl = design.imageUrl;
        this.thumbnailPreviewUrl = design.imageUrl;
        this.mainImageSelected = true;
        
        // Set current additional images
        this.currentAdditionalImageUrls = design.additionalImages || [];
        this.additionalImagePreviewUrls = [...this.currentAdditionalImageUrls];
        
        // Populate selected items
        this.selectedItemsWithQty = design.items.map(designItem => ({
          itemId: designItem.item.itemID,
          quantity: designItem.defaultQuantity,
          price: designItem.item.unitPrice
        }));
        
        // Calculate total price
        this.calculateTotalPrice();
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading design', err);
        this.errorMessage = 'Failed to load design. Please try again.';
        this.isLoading = false;
      }
    });
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      if (this.validateCurrentStep()) {
        this.currentStep++;
      }
    }
  }

  validateCurrentStep(): boolean {
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
        if (!this.thumbnailFile && !this.currentThumbnailUrl) {
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
      
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'File size exceeds 5MB. Please choose a smaller image.';
        event.target.value = '';
        return;
      }

      if (!file.type.match('image.*')) {
        this.errorMessage = 'Only image files are allowed.';
        event.target.value = '';
        return;
      }

      this.thumbnailFile = file;
      this.mainImageSelected = true;
      this.thumbnailChanged = true;

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
    this.thumbnailChanged = true;
  }

  restoreThumbnail(): void {
    if (this.currentThumbnailUrl) {
      this.thumbnailPreviewUrl = this.currentThumbnailUrl;
      this.mainImageSelected = true;
      this.thumbnailFile = null;
      this.thumbnailChanged = false;
    }
  }

  // Handle additional images upload
  onAdditionalImagesChange(event: any) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'File size exceeds 5MB. Please choose a smaller image.';
        event.target.value = '';
        return;
      }

      if (!file.type.match('image.*')) {
        this.errorMessage = 'Only image files are allowed.';
        event.target.value = '';
        return;
      }

      const totalImages = this.additionalImages.length + this.currentAdditionalImageUrls.length;
      
      if (totalImages < 2) {
        this.additionalImages.push(file);
        this.additionalImagesChanged = true;

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
    if (index < this.currentAdditionalImageUrls.length) {
      // Removing an existing image
      this.currentAdditionalImageUrls.splice(index, 1);
      this.additionalImagePreviewUrls.splice(index, 1);
    } else {
      // Removing a newly added image
      const newImageIndex = index - this.currentAdditionalImageUrls.length;
      this.additionalImages.splice(newImageIndex, 1);
      this.additionalImagePreviewUrls.splice(index, 1);
    }
    this.additionalImagesChanged = true;
  }

  isFormValid(): boolean {
    if (!this.isAdmin) {
      this.errorMessage = 'You do not have permission to edit designs. Admin privileges are required.';
      return false;
    }
    
    if (!this.formData.title.trim()) {
      return false;
    }

    if (!this.formData.category) {
      return false;
    }

    if (!this.thumbnailFile && !this.currentThumbnailUrl) {
      return false;
    }

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

  addItem(item: Item) {
    const existingItem = this.selectedItemsWithQty.find(selected => selected.itemId === item.itemID);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.selectedItemsWithQty.push({
        itemId: item.itemID,
        quantity: 1,
        price: item.unitPrice
      });
    }

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
    if (selection.quantity < 1) {
      selection.quantity = 1;
      this.errorMessage = 'Quantity must be at least 1.';
      setTimeout(() => this.errorMessage = '', 3000);
    }

    this.calculateTotalPrice();
  }

  removeSelectedItem(itemId: number): void {
    const index = this.selectedItemsWithQty.findIndex(item => item.itemId === itemId);
    if (index !== -1) {
      this.selectedItemsWithQty.splice(index, 1);
      this.calculateTotalPrice();
    }
  }

  calculateTotalPrice(): void {
    let total = 0;

    for (const item of this.selectedItemsWithQty) {
      const itemPrice = this.getItemPrice(item.itemId);
      total += itemPrice * item.quantity;
    }

    this.calculatedPrice = total;
    this.formData.price = total;
  }

  submit() {
    if (!this.isAdmin) {
      this.errorMessage = 'You do not have permission to edit designs. Admin privileges are required.';
      return;
    }
    
    if (!this.isFormValid()) {
      if (!this.formData.title.trim()) {
        this.errorMessage = 'Please enter a design title.';
      } else if (!this.formData.category) {
        this.errorMessage = 'Please select a category.';
      } else if (!this.thumbnailFile && !this.currentThumbnailUrl) {
        this.errorMessage = 'Please select a thumbnail image.';
      } else if (this.selectedItemsWithQty.length === 0) {
        this.errorMessage = 'Please select at least one item.';
      } else {
        this.errorMessage = 'Please fill all required fields.';
      }
      return;
    }

    // Find the category ID
    const selectedCategory = this.categories.find(cat => cat.name === this.formData.category);
    if (!selectedCategory) {
      this.errorMessage = 'Invalid category selected.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = 'Updating design...';

    // Handle image uploads
    const imageUploadPromises: Promise<string>[] = [];
    let mainImageUrl = this.currentThumbnailUrl;
    let additionalImageUrls = [...this.currentAdditionalImageUrls];

    // Upload new thumbnail if changed
    if (this.thumbnailFile && this.thumbnailChanged) {
      const thumbnailPromise = new Promise<string>((resolve, reject) => {
        this.cloudinaryService.uploadImage(this.thumbnailFile!).subscribe({
          next: (response) => resolve(response.secure_url),
          error: (err) => reject(err)
        });
      });
      imageUploadPromises.push(thumbnailPromise);
    }

    // Upload new additional images
    for (const file of this.additionalImages) {
      const promise = new Promise<string>((resolve, reject) => {
        this.cloudinaryService.uploadImage(file).subscribe({
          next: (response) => resolve(response.secure_url),
          error: (err) => reject(err)
        });
      });
      imageUploadPromises.push(promise);
    }

    if (imageUploadPromises.length > 0) {
      Promise.all(imageUploadPromises)
        .then(newImageUrls => {
          // Update URLs with newly uploaded images
          if (this.thumbnailFile && this.thumbnailChanged) {
            mainImageUrl = newImageUrls[0];
            additionalImageUrls.push(...newImageUrls.slice(1));
          } else {
            additionalImageUrls.push(...newImageUrls);
          }

          this.updateDesign(selectedCategory.categoryID, mainImageUrl, additionalImageUrls);
        })
        .catch(err => {
          this.isUploading = false;
          console.error('Error uploading images to Cloudinary', err);
          this.errorMessage = 'Failed to upload one or more images. Please try again.';
        });
    } else {
      // No new images to upload
      this.updateDesign(selectedCategory.categoryID, mainImageUrl, additionalImageUrls);
    }
  }

  updateDesign(categoryId: number, mainImageUrl: string, additionalImageUrls: string[]) {
    // Map selected items to the format expected by the API
    const itemsForRequest = this.selectedItemsWithQty.map(selection => ({
      itemId: selection.itemId,
      defaultQuantity: selection.quantity,
      isOptional: false
    }));
  
    // Create the update request object
    const designUpdateRequest = {
      name: this.formData.title,
      categoryId: categoryId,
      basePrice: this.formData.price,
      description: this.formData.description || '',
      imageUrl: mainImageUrl,
      additionalImages: additionalImageUrls,
      createdBy: this.authService.getUserDetails()?.userId || 1,
      items: itemsForRequest
    };
  
    console.log('Design update request payload:', designUpdateRequest);
  
    // Prepare the form data
    const formData = this.designService.prepareFormData(designUpdateRequest);
  
    this.designService.updateDesign(this.designId, formData).subscribe({
      next: (response: any) => {
        console.log('Design updated successfully:', response);
        this.isUploading = false;
        this.errorMessage = '';
        this.successMessage = 'Design updated successfully!';
        setTimeout(() => {
          this.router.navigate(['/admin-portfolio']);
        }, 2000);
      },
      error: (err: any) => {
        this.isUploading = false;
        console.error('Error updating design', err);
        if (err.status === 403) {
          this.errorMessage = 'You do not have permission to update designs. Admin privileges are required.';
        } else {
          this.errorMessage = 'Failed to update design: ' + (err.error?.message || err.message);
        }
      }
    });
  }

  cancel() {
    this.router.navigate(['/admin-portfolio']);
  }
}
