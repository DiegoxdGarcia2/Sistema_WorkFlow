import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ArchivoService {
  private readonly baseUrl = `${environment.apiUrl}/archivos`;

  constructor(private http: HttpClient) {}

  subir(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/upload`, formData);
  }

  getDownloadUrl(id: string, cloudUrl?: string): string {
    if (cloudUrl) return cloudUrl;
    return `${this.baseUrl}/download/${id}`;
  }
}
