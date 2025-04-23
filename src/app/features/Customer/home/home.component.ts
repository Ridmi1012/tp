import { Component, OnInit, HostListener } from '@angular/core';


@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit{
  constructor() {}

  ngOnInit(): void {
    // You can also call this manually once the page loads to check if sections are already visible
    this.checkSectionInView();
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event): void {
    console.log('Window is scrolling');  // This should log when you scroll
    this.checkSectionInView();
  }
  

  checkSectionInView(): void {
    const sections = document.querySelectorAll('.fade-in');
    
    sections.forEach((section: Element) => {
      const element = section as HTMLElement; // Cast to HTMLElement
      const rect = element.getBoundingClientRect();
      
      // Update the logic to trigger the animation when part of the section is visible
      const isInView = rect.top < window.innerHeight && rect.bottom >= 0; // Partially in view
      
      console.log('Checking section:', element, 'In view:', isInView); // Log to check
  
      if (isInView) {
        element.classList.add('visible');  // Trigger the animation when in view
      } else {
        element.classList.remove('visible');  // Hide the element when out of view
      }
    });
  }

}
