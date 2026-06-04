import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export interface PendingUpload {
  id: string; // Unique string identifier
  fileName: string;
  fileType: string;
  blob: Blob;
  addedAt: Date;
  fieldName: string;
  tramiteId: string;
  estado: 'PENDIENTE' | 'SUBIENDO' | 'FALLIDO';
  error?: string;
}

export class OfflineDatabase extends Dexie {
  pendingUploads!: Table<PendingUpload, string>;

  constructor() {
    super('BpmOfflineDatabase');
    this.version(1).stores({
      pendingUploads: 'id, fileName, estado, addedAt'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private db = new OfflineDatabase();

  constructor() {}

  async addPendingUpload(
    fileName: string,
    fileType: string,
    blob: Blob,
    tramiteId: string,
    fieldName: string
  ): Promise<PendingUpload> {
    const pending: PendingUpload = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(),
      fileName,
      fileType,
      blob,
      addedAt: new Date(),
      fieldName,
      tramiteId,
      estado: 'PENDIENTE'
    };
    await this.db.pendingUploads.add(pending);
    return pending;
  }

  async getPendingUploads(): Promise<PendingUpload[]> {
    return this.db.pendingUploads.toArray();
  }

  async getPendingUpload(id: string): Promise<PendingUpload | undefined> {
    return this.db.pendingUploads.get(id);
  }

  async updateUploadStatus(id: string, estado: 'PENDIENTE' | 'SUBIENDO' | 'FALLIDO', error?: string): Promise<void> {
    await this.db.pendingUploads.update(id, { estado, error });
  }

  async removeUpload(id: string): Promise<void> {
    await this.db.pendingUploads.delete(id);
  }

  async clearAll(): Promise<void> {
    await this.db.pendingUploads.clear();
  }
}
