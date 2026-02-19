import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, shareReplay, switchMap, startWith, tap } from 'rxjs';
import { Material, MaterialOption } from '../components/materials/models/material.model';

@Injectable({ providedIn: 'root' })
export class MaterialsService {
  private refresh$ = new Subject<void>();

  private materials$: Observable<Material[]> = this.refresh$.pipe(
    startWith(undefined),
    switchMap(() => this.http.get<Material[]>('/api/materials')),
    shareReplay(1)
  );

  constructor(private http: HttpClient) {}

  getMaterials(): Observable<Material[]> {
    return this.materials$;
  }

  invalidateCache(): void {
    this.refresh$.next();
  }

  createMaterial(data: Partial<Material>): Observable<Material> {
    return this.http.post<Material>('/api/materials', data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  updateMaterial(id: string, data: Partial<Material>): Observable<Material> {
    return this.http.put<Material>(`/api/materials/${id}`, data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  deleteMaterial(id: string): Observable<void> {
    return this.http.delete<void>(`/api/materials/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  addOption(materialId: string, option: Partial<MaterialOption>): Observable<Material> {
    return this.http.post<Material>(`/api/materials/${materialId}/options`, option).pipe(
      tap(() => this.invalidateCache())
    );
  }

  updateOption(materialId: string, optionId: string, option: Partial<MaterialOption>): Observable<Material> {
    return this.http.put<Material>(`/api/materials/${materialId}/options/${optionId}`, option).pipe(
      tap(() => this.invalidateCache())
    );
  }

  deleteOption(materialId: string, optionId: string): Observable<Material> {
    return this.http.delete<Material>(`/api/materials/${materialId}/options/${optionId}`).pipe(
      tap(() => this.invalidateCache())
    );
  }
}
