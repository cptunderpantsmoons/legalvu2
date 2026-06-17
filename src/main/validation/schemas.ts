import { z } from 'zod';

export const AIProviderSchema = z.enum(['openai', 'anthropic']);

export const ContractPromptInputSchema = z.object({
  contractType: z.string().min(1).max(2000),
  counterparty: z.string().min(1).max(2000),
  jurisdiction: z.string().min(1).max(2000),
  governingLaw: z.string().min(1).max(2000),
  keyTerms: z.array(z.string().min(1).max(500)).max(50),
  indemnity: z.boolean(),
  confidentiality: z.boolean(),
});

export const ContractGenerateSchema = z.object({
  provider: AIProviderSchema,
  model: z.string().min(1).max(100),
  input: ContractPromptInputSchema,
});

export const ContractStreamStartSchema = z.object({
  provider: AIProviderSchema,
  model: z.string().min(1).max(100),
  input: ContractPromptInputSchema,
});

export const ContractFetchSchema = z.object({
  id: z.string().min(1),
});

export const ContractSaveSchema = z.object({
  id: z.string().min(1),
  content: z.string().max(500000),
});

export const ContractTransitionSchema = z.object({
  id: z.string().min(1),
  target: z.enum(['draft', 'under_review', 'approved', 'signed', 'active', 'expired', 'terminated']),
});

export const AuthRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(200),
});

export const AuthLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const SettingsSetAiKeySchema = z.object({
  apiKey: z.string().min(1).max(200),
});

export const SettingsSetAiConfigSchema = z.object({
  provider: AIProviderSchema,
  model: z.string().min(1).max(100),
  baseUrl: z.string().url().optional().or(z.literal('')).refine(url => !url || url.startsWith('https://'), 'baseUrl must use HTTPS'),
});

export const SpBrowserStartSchema = z.object({
  headless: z.boolean().optional(),
});

export const SpBrowserNavigateSchema = z.object({
  url: z.string().url(),
});

export const SpBrowserScreenshotSchema = z.object({
  path: z.string().optional(),
});

export const ExportSchema = z.object({
  contractId: z.string().min(1),
});

export const AnalyzeSchema = z.object({
  contractText: z.string().min(10).max(100000),
  clientRole: z.string().optional(),
});

export const ImportContractSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(10).max(500000),
  counterparty: z.string().optional(),
  jurisdiction: z.string().optional(),
  contractType: z.string().optional(),
});

export const LawvuImportSchema = z.object({
  zipBase64: z.string().min(100).max(700000000),
});

export const SummarizeSchema = z.object({
  contractText: z.string().min(10).max(100000),
});

export const SpLoginSchema = z.object({
  siteUrl: z.string().url().refine(url => url.startsWith('https://'), 'siteUrl must use HTTPS'),
});

export const SpSetConnectionSchema = z.object({
  siteUrl: z.string().url().refine(url => url.startsWith('https://'), 'siteUrl must use HTTPS'),
  libraryPath: z.string().min(1),
  syncEnabled: z.boolean().optional(),
});

export const SpBrowseSchema = z.object({
  siteUrl: z.string().url().refine(url => url.startsWith('https://'), 'siteUrl must use HTTPS'),
  libraryPath: z.string().min(1),
});

export const SpDownloadSchema = z.object({
  siteUrl: z.string().url().refine(url => url.startsWith('https://'), 'siteUrl must use HTTPS'),
  fileName: z.string().min(1),
  localDir: z.string().min(1),
});

export const SpUploadSchema = z.object({
  siteUrl: z.string().url().refine(url => url.startsWith('https://'), 'siteUrl must use HTTPS'),
  libraryPath: z.string().min(1),
  localFilePath: z.string().min(1),
});

export const TemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.string().min(1).max(500000),
  description: z.string().optional(),
  contractType: z.string().optional(),
});

export const TemplateGenerateSchema = z.object({
  templateId: z.string().min(1),
  variables: z.record(z.string(), z.string()),
  title: z.string().min(1),
});

export const TemplateIdSchema = z.object({
  templateId: z.string().min(1),
});

export const AuditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  limit: z.number().optional().max(1000),
  offset: z.number().optional().min(0),
});
