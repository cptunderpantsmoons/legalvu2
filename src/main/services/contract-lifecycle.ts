import { getConnection } from '../database/connection';
import { getContract } from './contract-service';
import { log } from './audit-service';
import { rowToContract } from '../database/mappers';
import type { Contract, ContractStatus } from '../../shared/types';

const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['under_review'],
  under_review: ['approved', 'draft'],
  approved: ['signed', 'under_review'],
  signed: ['active'],
  active: ['expired', 'terminated'],
  expired: [],
  terminated: [],
};

export function getAllowedTransitions(status: ContractStatus): ContractStatus[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

export function isTransitionAllowed(from: ContractStatus, to: ContractStatus): boolean {
  return getAllowedTransitions(from).includes(to);
}

export function transitionStatus(
  contractId: string,
  target: ContractStatus,
  userId: string,
): Contract {
  const contract = getContract(contractId);
  if (!contract) {
    throw new Error(`Contract not found: ${contractId}`);
  }

  if (!isTransitionAllowed(contract.status, target)) {
    throw new Error(
      `Invalid transition: ${contract.status} → ${target}. Allowed: ${getAllowedTransitions(contract.status).join(', ') || '(terminal state)'}`,
    );
  }

  const db = getConnection();
  const now = Date.now();

  const updated = db.transaction(() => {
    db.prepare('UPDATE contracts SET status = ?, updated_at = ? WHERE id = ?').run(target, now, contractId);

    log({
      userId,
      action: 'contract:transition',
      entityType: 'contract',
      entityId: contractId,
      details: JSON.stringify({ from: contract.status, to: target }),
    });

    const row = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId) as Record<string, unknown> | undefined;
    if (!row) throw new Error('Contract disappeared during transition');
    return rowToContract(row);
  })();

  return updated;
}

export type { ContractStatus };