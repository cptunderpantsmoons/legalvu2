import { z } from 'zod';

export const LawvuContractRowSchema = z.object({
  Title: z.string().optional().default('Untitled'),
  Status: z.string().optional(),
  Counterparty: z.string().optional(),
  'Counter Party Name': z.string().optional(),
  Jurisdiction: z.string().optional(),
  'Contract Type': z.string().optional(),
  Type: z.string().optional(),
  Value: z.string().optional(),
  Currency: z.string().optional(),
  'Start Date': z.string().optional(),
  'End Date': z.string().optional(),
  'Effective Date': z.string().optional(),
  Owner: z.string().optional(),
  'Owner Email': z.string().optional(),
  Description: z.string().optional(),
  Notes: z.string().optional(),
  ID: z.string().optional(),
  'Matter ID': z.string().optional(),
  Division: z.string().optional(),
  Tags: z.string().optional(),
}).passthrough();

export const LawvuMatterFieldRowSchema = z.object({
  'Matter ID': z.string().optional(),
  'Field Name': z.string().optional(),
  'Field Value': z.string().optional(),
}).passthrough();

export type LawvuContractRow = z.infer<typeof LawvuContractRowSchema>;
export type LawvuMatterFieldRow = z.infer<typeof LawvuMatterFieldRowSchema>;

const STATUS_MAP: Record<string, string> = {
  draft: 'draft',
  active: 'active',
  'in negotiation': 'under_review',
  negotiating: 'under_review',
  'under review': 'under_review',
  review: 'under_review',
  pending: 'under_review',
  approved: 'approved',
  signed: 'signed',
  executed: 'signed',
  expired: 'expired',
  terminated: 'terminated',
  cancelled: 'terminated',
  renewed: 'active',
  'auto-renewed': 'active',
};

export function mapLawvuStatus(raw: string | undefined): string {
  if (!raw) return 'draft';
  const normalized = raw.toLowerCase().trim();
  return STATUS_MAP[normalized] ?? 'draft';
}

export function parseDateToMs(raw: string | undefined): number | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  const attempts = [
    new Date(trimmed).getTime(),
    Date.parse(trimmed),
    new Date(parseInt(trimmed, 10)).getTime(),
    new Date(parseInt(trimmed, 10) * 1000).getTime(),
  ];
  for (const ts of attempts) {
    if (!isNaN(ts) && ts > 0) return ts;
  }
  return null;
}

export function parseTabDelimited(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t').map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
}
