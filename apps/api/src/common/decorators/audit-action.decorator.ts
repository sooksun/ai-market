import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';
export const AUDIT_ENTITY_KEY = 'auditEntity';

export interface AuditOptions {
  action: string;
  entityType: string;
  entityIdParam?: string;
}

export const AuditAction = (opts: AuditOptions) => SetMetadata(AUDIT_ACTION_KEY, opts);
