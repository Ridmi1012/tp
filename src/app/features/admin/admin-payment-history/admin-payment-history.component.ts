import { Component , OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { AdminOrderDetailsComponent } from '../admin-order-details/admin-order-details.component';
import { PaymentService, Payment } from '../../../services/payment.service';
import { OrderService } from '../../../services/order.service';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';


@Component({
  selector: 'app-admin-payment-history',
  imports: [  CommonModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    DatePipe],

  templateUrl: './admin-payment-history.component.html',
  styleUrl: './admin-payment-history.component.css'
})
export class AdminPaymentHistoryComponent implements OnInit {
  filterForm: FormGroup;
  payments: Payment[] = [];
  displayedColumns: string[] = [
    'orderNumber', 
    'customerName', 
    'eventDate', 
    'paymentType', 
    'amount', 
    'submittedDate', 
    'status', 
    'actions'
  ];
  loading = true;
  error: string | null = null;
  
  // Pagination
  totalPayments = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];
  
  // Sorting
  sortField = 'submittedDate';
  sortDirection = 'desc';

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private orderService: OrderService,
    private dialog: MatDialog
  ) {
    this.filterForm = this.fb.group({
      status: [''],
      startDate: [''],
      endDate: [''],
      searchTerm: ['']
    });
  }

  ngOnInit() {
    this.loadPayments();
  }

loadPayments() {
  this.loading = true;
  this.error = null;
  
  // Extract filter values
  const filters = this.filterForm.value;
  const startDate = filters.startDate ? new Date(filters.startDate).toISOString() : undefined;
  const endDate = filters.endDate ? new Date(filters.endDate).toISOString() : undefined;
  
  this.paymentService.getAllPayments(
    undefined,        // orderId - not provided, so pass undefined
    filters.status,   // status
    startDate,        // startDate
    endDate,          // endDate
    this.pageIndex + 1, // page
    this.pageSize,    // pageSize
    // You can add other parameters if needed (searchTerm, sortField, sortDirection)
  ).subscribe({
    next: (response) => {
      this.payments = response.data;
      this.totalPayments = response.total;
      this.loading = false;
    },
    error: (error) => {
      console.error('Error loading payments:', error);
      this.error = 'Failed to load payment history. Please try again.';
      this.loading = false;
    }
  });
}

  applyFilters() {
    this.pageIndex = 0; // Reset to first page when applying filters
    this.loadPayments();
  }

  resetFilters() {
    this.filterForm.reset({
      status: '',
      startDate: '',
      endDate: '',
      searchTerm: ''
    });
    this.pageIndex = 0;
    this.loadPayments();
  }

  handlePageEvent(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadPayments();
  }

  handleSort(sort: Sort) {
    this.sortField = sort.active;
    this.sortDirection = sort.direction;
    this.loadPayments();
  }

  viewOrderDetails(orderId: string) {
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.dialog.open(AdminOrderDetailsComponent, {
          width: '1000px',
          data: order
        });
      },
      error: (error) => {
        console.error('Error loading order details:', error);
      }
    });
  }

  viewPaymentSlip(payment: Payment) {
    window.open(payment.slipUrl, '_blank');
  }

  getStatusChipColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'pending': 'warn',
      'verified': 'primary',
      'rejected': 'warn'
    };
    return statusColors[status] || 'basic';
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'pending': 'Pending Verification',
      'verified': 'Verified',
      'rejected': 'Rejected'
    };
    return statusLabels[status] || status;
  }

  formatDate(date: string): string {
    const formattedDate = new Date(date);
    return formattedDate.toLocaleDateString() + ' ' + formattedDate.toLocaleTimeString();
  }
}
