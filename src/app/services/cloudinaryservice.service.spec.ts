import { TestBed } from '@angular/core/testing';

import { CloudinaryserviceService } from './cloudinaryservice.service';

describe('CloudinaryserviceService', () => {
  let service: CloudinaryserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CloudinaryserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
