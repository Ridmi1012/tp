import { Component , OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../services/auth.service';



interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location: string;
  status: string;
  orderId: number;
}

@Component({
  selector: 'app-admin-event-calander',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule],
  templateUrl: './admin-event-calander.component.html',
  styleUrl: './admin-event-calander.component.css'
})
export class AdminEventCalanderComponent implements OnInit {
  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: any[] = [];
  currentDate = new Date();
  currentMonth: number;
  currentYear: number;
  currentMonthYear: string = '';
  events: CalendarEvent[] = [];
  todayEvents: CalendarEvent[] = [];
  loading = true;
  error: string | null = null;
  
  private apiUrl = 'http://localhost:8083/api/events';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
  }

  ngOnInit() {
    this.updateCalendarTitle();
    this.loadEvents();
  }

  loadEvents() {
    this.loading = true;
    this.error = null;
    
    // Get events for the current month
    const startDate = new Date(this.currentYear, this.currentMonth, 1);
    const endDate = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    const headers = this.getAuthHeaders();
    
    this.http.get<CalendarEvent[]>(
      `${this.apiUrl}/range?startDate=${this.formatDateForApi(startDate)}&endDate=${this.formatDateForApi(endDate)}`, 
      { headers }
    ).pipe(
      finalize(() => {
        this.loading = false;
      }),
      catchError(error => {
        console.error('Error loading events:', error);
        this.error = 'Failed to load events. Please try again.';
        return of([]);
      })
    ).subscribe(events => {
      if (events) {
        this.events = events;
        this.generateCalendar();
        this.loadTodayEvents();
      }
    });
  }

  loadTodayEvents() {
    const headers = this.getAuthHeaders();
    
    this.http.get<CalendarEvent[]>(`${this.apiUrl}/today`, { headers })
      .subscribe({
        next: (events) => {
          this.todayEvents = events;
        },
        error: (error) => {
          console.error('Error loading today\'s events:', error);
        }
      });
  }

  previousMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.updateCalendarTitle();
    this.loadEvents();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.updateCalendarTitle();
    this.loadEvents();
  }

  updateCalendarTitle() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    this.currentMonthYear = `${monthNames[this.currentMonth]} ${this.currentYear}`;
  }

  generateCalendar() {
    this.calendarDays = [];
    
    // Get first day of month
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const startingDayIndex = firstDay.getDay();
    
    // Get last day of previous month
    const lastDayPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
    
    // Get last day of current month
    const lastDayCurrMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    
    // Days from previous month
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const date = new Date(this.currentYear, this.currentMonth - 1, lastDayPrevMonth - i);
      this.calendarDays.push({
        date: date,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
    
    // Days from current month
    for (let i = 1; i <= lastDayCurrMonth; i++) {
      const date = new Date(this.currentYear, this.currentMonth, i);
      this.calendarDays.push({
        date: date,
        isCurrentMonth: true,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
    
    // Calculate remaining days needed to complete the calendar (6 rows x 7 days = 42 total)
    const remainingDays = 42 - this.calendarDays.length;
    
    // Days from next month
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(this.currentYear, this.currentMonth + 1, i);
      this.calendarDays.push({
        date: date,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    return this.events.filter(event => {
      const eventDate = new Date(event.eventDate);
      return eventDate.getDate() === date.getDate() && 
             eventDate.getMonth() === date.getMonth() && 
             eventDate.getFullYear() === date.getFullYear();
    });
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  }

  formatTime(time: string): string {
    if (!time) return '';
    
    // Convert 24-hour time format to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${hour12}:${minutes} ${ampm}`;
  }

  formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'scheduled': 'Scheduled',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusLabels[status] || status;
  }

  getNextStatus(currentStatus: string): string {
    const statusFlow: { [key: string]: string } = {
      'scheduled': 'in-progress',
      'in-progress': 'completed'
    };
    return statusFlow[currentStatus] || currentStatus;
  }

  getNextStatusLabel(currentStatus: string): string {
    const nextStatus = this.getNextStatus(currentStatus);
    if (nextStatus === 'in-progress') {
      return 'START EVENT';
    } else if (nextStatus === 'completed') {
      return 'COMPLETE EVENT';
    }
    return 'UPDATE STATUS';
  }

  viewOrderDetails(orderId: number) {
    window.open(`/admin/orderdetails/${orderId}`, '_blank');
  }

  updateEventStatus(eventId: number, newStatus: string) {
    const headers = this.getAuthHeaders();
    
    this.http.patch(`${this.apiUrl}/${eventId}/status`, { status: newStatus }, { headers })
      .subscribe({
        next: () => {
          // Refresh the data
          this.loadEvents();
        },
        error: (error) => {
          console.error('Error updating event status:', error);
          alert('Failed to update event status. Please try again.');
        }
      });
  }

  private getAuthHeaders() {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

}
