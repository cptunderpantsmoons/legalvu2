const skillsRaw = import.meta.glob('../data/legal-skills/*/SKILL.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const _skillCache: Record<string, string> = {};
for (const [path, content] of Object.entries(skillsRaw)) {
  const match = path.match(/legal-skills\/([^/]+)\/SKILL\.md$/);
  if (match) {
    _skillCache[match[1]] = extractExpertiseBody(content);
  }
}

export const CONTRACT_TYPE_TO_SKILL: Record<string, string> = {
  nda: 'confidentiality-nda',
  'non-disclosure': 'confidentiality-nda',
  confidentiality: 'confidentiality-nda',
  'mutual nda': 'confidentiality-nda',
  'confidentiality agreement': 'confidentiality-agreement',
  'employee nda': 'employee-nda',
  cia: 'confidentiality-invention-assignment',
  'confidentiality invention': 'confidentiality-invention-assignment',
  msa: 'consulting-services-agreement',
  'master services': 'consulting-services-agreement',
  'services agreement': 'consulting-services-agreement',
  consulting: 'consulting-services-agreement',
  sow: 'consulting-services-agreement',
  'statement of work': 'consulting-services-agreement',
  employment: 'executive-employment-agreement',
  'executive employment': 'executive-employment-agreement',
  'offer letter': 'at-will-employment-offer-letter',
  'at-will': 'at-will-employment-offer-letter',
  contractor: 'independent-contractor-agreement',
  'independent contractor': 'independent-contractor-agreement',
  arbitration: 'employee-arbitration-agreement',
  retention: 'employee-retention-agreement',
  severance: 'employee-separation-release',
  'separation release': 'employee-separation-release',
  handbook: 'employee-handbook',
  eula: 'eula',
  'end user license': 'eula',
  'api license': 'api-license-agreement',
  'copyright license': 'copyright-license-agreement',
  license: 'copyright-license-agreement',
  licensing: 'copyright-license-agreement',
  dpa: 'data-processing-addendum',
  'data processing': 'data-processing-addendum',
  gdpr: 'gdpr-dpa',
  hipaa: 'hipaa-baa',
  baa: 'hipaa-baa',
  'asset purchase': 'asset-purchase-agreement',
  escrow: 'escrow-agreement',
  'finders fee': 'finders-fee-agreement',
  guaranty: 'guaranty-agreement',
  guarantee: 'guaranty-agreement',
  franchise: 'franchise-agreement',
  indemnification: 'indemnification-agreement',
  'invention assignment': 'invention-assignment-agreement',
  'investors rights': 'investors-rights-agreement',
  'convertible note': 'convertible-note-purchase-agreement',
  'equity financing': 'equity-financing-term-sheet',
  'term sheet': 'equity-financing-term-sheet',
  'due diligence': 'due-diligence-checklist',
};

export function getExpertiseForContractType(contractType: string): string | null {
  const normalized = contractType.toLowerCase().trim();
  const skillKey = CONTRACT_TYPE_TO_SKILL[normalized] ?? findFuzzyMatch(normalized);
  if (!skillKey) return null;
  return _skillCache[skillKey] ?? null;
}

function findFuzzyMatch(normalized: string): string | null {
  for (const [key, skill] of Object.entries(CONTRACT_TYPE_TO_SKILL)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return skill;
    }
  }
  return null;
}

function extractExpertiseBody(skillMd: string): string {
  const lines = skillMd.split('\n');
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^# [A-Z]/)) {
      startIndex = i;
      break;
    }
  }
  if (startIndex === -1) return skillMd;
  return lines.slice(startIndex).join('\n').trim();
}

export function listAvailableExpertise(): string[] {
  return Object.keys(_skillCache);
}

export function getAnalysisExpertise(): string {
  return _skillCache['contract-analysis'] ?? '';
}

export function getSummarizationExpertise(): string {
  return _skillCache['contract-summarization'] ?? '';
}
