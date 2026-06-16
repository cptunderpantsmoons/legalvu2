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
  model: z.string().min(1),
  input: ContractPromptInputSchema,
});

export const ContractStreamStartSchema = z.object({
  provider: AIProviderSchema,
  model: z.string().min(1),
  input: ContractPromptInputSchema,
});

export const ContractFetchSchema = z.object({
  id: z.string().min(1),
});

export const ContractSaveSchema = z.object({
  id: z.string().min(1),
  content: z.string(),
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
  apiKey: z.string().min(1),
});

export const SettingsSetAiConfigSchema = z.object({
  provider: AIProviderSchema,
  model: z.string().min(1),
  baseUrl: z.string().url().optional().or(z.literal('')),
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
  contractText: z.string().min(10),
  clientRole: z.string().optional(),
});

export const ImportContractSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(10),
  counterparty: z.string().optional(),
  jurisdiction: z.string().optional(),
  contractType: z.string().optional(),
});

export const LawvuImportSchema = z.object({
  zipBase64: z.string().min(100),
});

export const SummarizeSchema = z.object({
  contractText: z.string().min(10),
});

export const SpLoginSchema = z.object({
  siteUrl: z.string().url(),
});

export const SpSetConnectionSchema = z.object({
  siteUrl: z.string().url(),
  libraryPath: z.string().min(1),
  syncEnabled: z.boolean().optional(),
});

export const SpBrowseSchema = z.object({
  siteUrl: z.string().url(),
  libraryPath: z.string().min(1),
});

export const SpDownloadSchema = z.object({
  siteUrl: z.string().url(),
  fileName: z.string().min(1),
  localDir: z.string().min(1),
});

export const SpUploadSchema = z.object({
  siteUrl: z.string().url(),
  libraryPath: z.string().min(1),
  localFilePath: z.string().min(1),
});

export const TemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.string().min(1),
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
  limit: z.number().optional(),
});
