export interface AuditLog {
  id: number;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: number;
}
