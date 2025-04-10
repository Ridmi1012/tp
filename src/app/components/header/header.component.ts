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

  constructor(private authService: AuthService, private router: Router) {}

  get isLoggedIn() {
    return this.authService.isLoggedIn();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
    this.showProfileDropdown = false;
    this.showServicesDropdown = false;
  }

  toggleProfileDropdown() {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  toggleServicesDropdown() {
    this.showServicesDropdown = !this.showServicesDropdown;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}
