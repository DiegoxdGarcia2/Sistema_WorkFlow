import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface CampoFormulario {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'file' | 'textarea';
  required: boolean;
  options?: string[];
  validations?: {
    min?: number;
    max?: number;
    pattern?: string;
    customMsg?: string;
  };
}

export interface FormularioTemplate {
  id?: string;
  tenantId: string;
  nombre: string;
  descripcion: string;
  campos: CampoFormulario[];
}

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FormularioService {
  private readonly baseUrl = `${environment.apiUrl}/formularios`;
  
  templates = signal<FormularioTemplate[]>([]);

  constructor(private http: HttpClient) {}

  listarPorTenant(tenantId: string): Observable<FormularioTemplate[]> {
    return this.http.get<FormularioTemplate[]>(`${this.baseUrl}/tenant/${tenantId}`).pipe(
      tap(data => this.templates.set(data))
    );
  }

  buscarPorId(id: string): Observable<FormularioTemplate> {
    return this.http.get<FormularioTemplate>(`${this.baseUrl}/${id}`);
  }

  crear(template: FormularioTemplate): Observable<FormularioTemplate> {
    return this.http.post<FormularioTemplate>(this.baseUrl, template);
  }

  actualizar(id: string, template: FormularioTemplate): Observable<FormularioTemplate> {
    return this.http.put<FormularioTemplate>(`${this.baseUrl}/${id}`, template);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
