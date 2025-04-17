import { Component, HostListener } from '@angular/core';
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
export class HeaderComponent {
  menuOpen = false;
  showProfileDropdown = false;
  showServicesDropdown = false;
  showAdminDropdown = false;
  
  // Initialize with default values, will be updated from API
  todayEvents = 0; 
  unreadNotifications = 0;
  adminName = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // If user is admin, fetch the required data for badges
    if (this.isAdmin) {
      this.loadAdminData();
    }
  }

  loadAdminData() {
    // Get today's events count
    this.authService.getTodayEventsCount().subscribe({
      next: (count) => this.todayEvents = count,
      error: (err) => console.error('Failed to load today\'s events count', err)
    });

    // Get unread notifications count
    this.authService.getUnreadNotificationsCount().subscribe({
      next: (count) => this.unreadNotifications = count,
      error: (err) => console.error('Failed to load unread notifications count', err)
    });

    // Get admin profile for name display
    this.authService.getAdminProfile().subscribe({
      next: (profile) => {
        if (profile && profile.firstName) {
          this.adminName = profile.firstName + ' ' + (profile.lastName || '');
        }
      },
      error: (err) => console.error('Failed to load admin profile', err)
    });
  }

  get isLoggedIn() {
    return this.authService.isLoggedIn();
  }

  get isAdmin() {
    return this.authService.isAdmin();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
    this.showProfileDropdown = false;
    this.showServicesDropdown = false;
    this.showAdminDropdown = false;
  }

  toggleProfileDropdown() {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  toggleServicesDropdown() {
    this.showServicesDropdown = !this.showServicesDropdown;
  }
  
  toggleAdminDropdown() {
    this.showAdminDropdown = !this.showAdminDropdown;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}
