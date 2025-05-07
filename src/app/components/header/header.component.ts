import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})

  export class HeaderComponent implements OnInit {
    isLoggedIn = false;
  isAdmin = false;
  menuOpen = false;
  showProfileDropdown = false;
  showAdminDropdown = false;
  showOrdersDropdown = false; // New property for Orders dropdown
  adminName: string | null = null;
  todayEvents = 0;
  unreadNotifications = 0;
  pendingOrders = 0; // New counter for pending orders
  confirmedOrders = 0; // New counter for confirmed orders
  pendingPayments = 0; // New counter for payments awaiting verification
  customerId: number | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.updateAuthStatus();
    
    // Subscribe to auth changes
    this.authService.authChange.subscribe(() => {
      this.updateAuthStatus();
    });
  }

  private updateAuthStatus(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (this.isLoggedIn) {
      // Get user details
      const userDetails = this.authService.getUserDetails();
      this.isAdmin = this.authService.isAdmin();
      
      // Get the customer ID for edit profile link
      this.customerId = this.authService.getCustomerId();
      
      if (this.isAdmin && userDetails) {
        this.adminName = userDetails.firstName || null;
        
        // Load admin-specific information
        this.loadAdminData();
      }
    } else {
      this.isAdmin = false;
      this.customerId = null;
      this.adminName = null;
    }
  }

  private loadAdminData(): void {
    // Load notification counts, etc. for admin
    this.authService.getTodayEventsCount().subscribe({
      next: (count) => this.todayEvents = count,
      error: (err) => console.error('Error loading today events count', err)
    });
    
    this.authService.getUnreadNotificationsCount().subscribe({
      next: (count) => this.unreadNotifications = count,
      error: (err) => console.error('Error loading unread notifications count', err)
    });

    // Add new service calls for order-related counters
    this.loadOrderCounters();
  }

  // New method to load order-related counters
  private loadOrderCounters(): void {
    // You'll need to create these methods in your AuthService or create a new OrderService
    this.authService.getPendingOrdersCount().subscribe({
      next: (count) => this.pendingOrders = count,
      error: (err) => console.error('Error loading pending orders count', err)
    });
    
    this.authService.getConfirmedOrdersCount().subscribe({
      next: (count) => this.confirmedOrders = count,
      error: (err) => console.error('Error loading confirmed orders count', err)
    });
    
    this.authService.getPendingPaymentsCount().subscribe({
      next: (count) => this.pendingPayments = count,
      error: (err) => console.error('Error loading pending payments count', err)
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    // Close other dropdowns when toggling menu
    if (this.menuOpen) {
      this.showProfileDropdown = false;
      this.showAdminDropdown = false;
      this.showOrdersDropdown = false; // Close Orders dropdown as well
    }
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.showProfileDropdown = false;
    this.showAdminDropdown = false;
    this.showOrdersDropdown = false; // Close Orders dropdown as well
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
    // Close other dropdowns
    if (this.showProfileDropdown) {
      this.showAdminDropdown = false;
      this.showOrdersDropdown = false; // Close Orders dropdown as well
    }
  }

  toggleAdminDropdown(): void {
    this.showAdminDropdown = !this.showAdminDropdown;
    // Close other dropdowns
    if (this.showAdminDropdown) {
      this.showProfileDropdown = false;
      this.showOrdersDropdown = false; // Close Orders dropdown as well
    }
  }

  // New method to toggle Orders dropdown
  toggleOrdersDropdown(): void {
    this.showOrdersDropdown = !this.showOrdersDropdown;
    // Close other dropdowns
    if (this.showOrdersDropdown) {
      this.showProfileDropdown = false;
      this.showAdminDropdown = false;
    }
  }

  logout(): void {
    this.authService.logout();
    this.closeMenu();
    this.router.navigate(['/login']);
  }
}
