export type ContractStatus = 'draft' | 'under_review' | 'approved' | 'signed' | 'active' | 'expired' | 'terminated';

export interface Contract {
  id: string;
  title: string;
  status: ContractStatus;
  counterparty?: string;
  jurisdiction?: string;
  content?: string;
  metadata?: string;
  aiPromptVersion?: string;
  aiModel?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
