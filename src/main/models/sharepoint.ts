export interface SharePointConnection {
  id: string;
  userId: string;
  siteUrl: string;
  libraryPath: string;
  syncEnabled: number;
  spCookiesEncrypted?: string;
  lastError?: string;
  lastSyncAt?: number;
  createdAt: number;
  updatedAt: number;
}
