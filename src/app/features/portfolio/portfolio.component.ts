import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio',
  imports: [CommonModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css'
})
export class PortfolioComponent {

  categories = [
    {
      name: 'Birthdays',
      images: [
        'assets/images/image 3.png',
        'assets/images/image 4.png',
        'assets/images/image 5.png',
        'assets/images/image 8.png',
        'assets/images/image 9.png'
      ],
      currentIndex: 0
    },
    {
      name: 'Bride To Be',
      images: [
        'assets/images/image 3.png',
        'assets/images/image 4.png',
        'assets/images/image 5.png',
        'assets/images/image 8.png',
        'assets/images/image 9.png'
      ],
      currentIndex: 0
    },
    {
      name: 'Weddings',
      images: [
        'assets/images/image 3.png',
        'assets/images/image 4.png',
        'assets/images/image 5.png',
        'assets/images/image 8.png',
        'assets/images/image 9.png'
      ],
      currentIndex: 0
    },
    {
      name: 'First Holy Communion',
      images: [
        'assets/images/image 3.png',
        'assets/images/image 4.png',
        'assets/images/image 5.png',
        'assets/images/image 8.png',
        'assets/images/image 9.png'
      ],
      currentIndex: 0
    },
    {
      name: 'Gender Reveal',
      images: [
        'assets/images/image 3.png',
        'assets/images/image 4.png',
        'assets/images/image 5.png',
        'assets/images/image 8.png',
        'assets/images/image 9.png'
      ],
      currentIndex: 0
    }
  ];

  prevSlide(category: any) {
    if (category.currentIndex > 0) {
      category.currentIndex -= 1;
    }
  }

  nextSlide(category: any) {
    if (category.currentIndex < category.images.length - 4) {
      category.currentIndex += 1;
    }
  }
}
