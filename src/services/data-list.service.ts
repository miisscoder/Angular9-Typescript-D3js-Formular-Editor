import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../environments/environment';

/**
 * This class provides the DataListService service with methods to read names and add names.
 */
@Injectable()
export class DataListService {
  url = '';

  constructor(private http: HttpClient) {
    this.url = environment.api;
  }

  // Returns an Observable for the HTTP GET request for the JSON resource.

  get(urlAddress: string): Observable<any> {
    return this.http.get(this.url + urlAddress).pipe(delay(500));
  }

}
