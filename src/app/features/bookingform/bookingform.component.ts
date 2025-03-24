import { FormsModule } from '@angular/forms';
import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

declare var atlas: any; 

@Component({
  selector: 'app-bookingform',
  imports: [FormsModule, CommonModule],
  templateUrl: './bookingform.component.html',
  styleUrls: ['./bookingform.component.css']
})
export class BookingFormComponent implements AfterViewInit {
  @ViewChild('searchBox', { static: false }) searchBox!: ElementRef;
  map: any;
  userLocation = [79.9201, 7.2845]; // Katana, Sri Lanka
  marker: any;
  searchResults: { address: string, position: { lat: number; lon: number } }[] = [];
  selectedImage: any = null; 
  bookingData = {
    name: '',
    email: '',
    contact: '',
    venue: '',
    distance: '',
    eventType: '',
    theme: '',
    eventDate: '',
    backdrops: 1,
    uploadedImage: '' 
  };

  ngAfterViewInit() {
    this.initMap();
  }

  initMap() {
    this.map = new atlas.Map("map", {
      center: this.userLocation,
      zoom: 10,
      authOptions: {
        authType: 'subscriptionKey',
        subscriptionKey: '2Hl8ZHiFElR0mIlhu9RKbirEGVb7tySOvPf7MNc5I6WSRqtVjTP0JQQJ99BBACYeBjFtZwVqAAAgAZMPx6C9' // Replace with actual Azure Maps key
      }
    });

    this.marker = new atlas.HtmlMarker({ position: this.userLocation });
    this.map.markers.add(this.marker);
    this.initSearchBox();
  }

  initSearchBox() {
    const searchInput = this.searchBox.nativeElement;
    searchInput.addEventListener('input', () => {
      this.getAutoSuggestions(searchInput.value);
    });
  }

  getAutoSuggestions(query: string) {
    if (!query.trim()) {
      this.searchResults = [];
      return;
    }

    fetch(`https://atlas.microsoft.com/search/fuzzy/json?api-version=1.0&subscription-key=2Hl8ZHiFElR0mIlhu9RKbirEGVb7tySOvPf7MNc5I6WSRqtVjTP0JQQJ99BBACYeBjFtZwVqAAAgAZMPx6C9&query=${query}&countrySet=LK`)
      .then(response => response.json())
      .then(data => {
        this.searchResults = data.results.map((result: any) => ({
          address: result.address.freeformAddress,
          position: result.position
        }));

       
        if (this.searchResults.length > 0) {
          this.autoSelectFirstResult();
        }
      })
      .catch(error => console.error("Error fetching suggestions:", error));
  }

  autoSelectFirstResult() {
    const firstResult = this.searchResults[0];
    if (firstResult) {
      this.bookingData.venue = firstResult.address;
      this.updateMap(firstResult.position);
      this.calculateDistance(firstResult.position);
    }
  }

  updateMap(destination: { lat: number; lon: number }) {
    this.map.setCamera({ center: [destination.lon, destination.lat] });
    this.marker.setOptions({ position: [destination.lon, destination.lat] });
  }

  calculateDistance(destination: { lat: number; lon: number }) {
    const origins = `${this.userLocation[1]},${this.userLocation[0]}`;  // Ensure format: lat,lon
    const destinations = `${destination.lat},${destination.lon}`;
  
    const url = `https://atlas.microsoft.com/route/distance/matrix/json?api-version=1.0&subscription-key=2Hl8ZHiFElR0mIlhu9RKbirEGVb7tySOvPf7MNc5I6WSRqtVjTP0JQQJ99BBACYeBjFtZwVqAAAgAZMPx6C9&origins=${origins}&destinations=${destinations}&travelMode=car`;
  
    console.log("Fetching distance from:", origins, "to", destinations); // Debugging
  
    fetch(url)
      .then(response => response.json())
      .then(data => {
        console.log("Distance API Response:", data); // Debugging
  
        if (data.matrix && data.matrix.length > 0 && data.matrix[0].length > 0) {
          this.bookingData.distance = data.matrix[0][0].response.distance + " km";
          console.log("Calculated Distance:", this.bookingData.distance);
        } else {
          console.error("Invalid distance data received:", data);
        }
      })
      .catch(error => console.error("Error fetching distance:", error));
  }
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImage = e.target.result; 
        this.bookingData.uploadedImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
}
