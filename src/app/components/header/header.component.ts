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
    adminName: string | null = null;
    todayEvents = 0;
    unreadNotifications = 0;
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
    }
  
    toggleMenu(): void {
      this.menuOpen = !this.menuOpen;
      // Close other dropdowns when toggling menu
      if (this.menuOpen) {
        this.showProfileDropdown = false;
        this.showAdminDropdown = false;
      }
    }
  
    closeMenu(): void {
      this.menuOpen = false;
      this.showProfileDropdown = false;
      this.showAdminDropdown = false;
    }
  
    toggleProfileDropdown(): void {
      this.showProfileDropdown = !this.showProfileDropdown;
      // Close other dropdowns
      if (this.showProfileDropdown) {
        this.showAdminDropdown = false;
      }
    }
  
    toggleAdminDropdown(): void {
      this.showAdminDropdown = !this.showAdminDropdown;
      // Close other dropdowns
      if (this.showAdminDropdown) {
        this.showProfileDropdown = false;
      }
    }
  
    logout(): void {
      this.authService.logout();
      this.closeMenu();
      this.router.navigate(['/login']);
    }
}
