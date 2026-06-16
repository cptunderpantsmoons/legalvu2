export type SyncStatus = 'unsynced' | 'downloaded' | 'uploaded' | 'synced';

export interface Document {
  id: string;
  filename: string;
  localPath: string;
  sha256?: string;
  spUrl?: string;
  spSyncStatus: SyncStatus;
  sizeBytes?: number;
  contractId?: string;
  createdAt: number;
  updatedAt: number;
}
