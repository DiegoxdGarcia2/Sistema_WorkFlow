import { Injectable, inject, signal } from '@angular/core';
import { OfflineStorageService, PendingUpload } from './offline-storage.service';
import { OnlineStatusService } from './online-status.service';
import { ArchivoService } from './archivo.service';
import { firstValueFrom, Subject } from 'rxjs';

export interface SyncResult {
  uploadId: string;
  success: boolean;
  fileId?: string;
  url?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineUploadQueueService {
  private offlineDb = inject(OfflineStorageService);
  private onlineStatus = inject(OnlineStatusService);
  private archivoService = inject(ArchivoService);

  public isSyncing = signal<boolean>(false);
  public syncFinished$ = new Subject<SyncResult>();

  constructor() {
    // Automatically trigger sync when coming online
    this.onlineStatus.statusChanges.subscribe((online) => {
      if (online) {
        this.syncQueue();
      }
    });
  }

  async syncQueue(): Promise<void> {
    if (this.isSyncing()) return;
    
    const pending = await this.offlineDb.getPendingUploads();
    const pendingToSync = pending.filter(u => u.estado !== 'SUBIENDO');
    
    if (pendingToSync.length === 0) return;

    this.isSyncing.set(true);
    
    for (const upload of pendingToSync) {
      try {
        await this.offlineDb.updateUploadStatus(upload.id, 'SUBIENDO');
        
        // Reconstruct the File object from Blob
        const file = new File([upload.blob], upload.fileName, { type: upload.fileType });
        
        // Upload to S3 via backend Core
        const response = await firstValueFrom(this.archivoService.subir(file));
        
        // Assume backend returns something like { id: '...', url: '...' }
        const fileId = response.id || response.fileId;
        const fileUrl = response.url || response.cloudUrl;

        await this.offlineDb.removeUpload(upload.id);
        
        this.syncFinished$.next({
          uploadId: upload.id,
          success: true,
          fileId,
          url: fileUrl
        });
      } catch (err: any) {
        console.error(`Error syncing upload ${upload.id}:`, err);
        await this.offlineDb.updateUploadStatus(
          upload.id, 
          'FALLIDO', 
          err.message || 'Error en la subida a S3'
        );
        this.syncFinished$.next({
          uploadId: upload.id,
          success: false,
          error: err.message || 'Error de red en la subida'
        });
      }
    }
    
    this.isSyncing.set(false);
  }
}
