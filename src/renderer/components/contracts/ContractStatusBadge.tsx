import React from 'react';
import type { ContractStatus } from '../../../shared/types';

const STATUS_STYLES: Record<ContractStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  under_review: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Under Review' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved' },
  signed: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Signed' },
  active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
  expired: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Expired' },
  terminated: { bg: 'bg-red-100', text: 'text-red-800', label: 'Terminated' },
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
