import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { getConnection } from '../database/connection';
import { log } from './audit-service';
import { DEFAULT_TEMPLATES, extractVariables, fillTemplate } from '../data/default-templates';

export interface Template {
  id: string;
  name: string;
  description?: string;
  contractType?: string;
  variableSchema?: string;
  filePath: string;
  isDefault: boolean;
}

export interface TemplateWithVariables extends Template {
  variables: string[];
  content: string;
}

function getTemplateDir(): string {
  try {
    const dir = path.join(require('electron').app.getPath('userData'), 'templates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    const dir = path.join(require('os').tmpdir(), 'legalvu-data', 'templates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}

export function seedDefaultTemplates(userId: string): void {
  const db = getConnection();
  const existing = db.prepare('SELECT COUNT(*) as count FROM templates WHERE is_default = 1').get() as { count: number };
  if (existing.count > 0) return;

  const dir = getTemplateDir();

  for (const tmpl of DEFAULT_TEMPLATES) {
    const id = crypto.randomUUID();
    const fileName = `${id}.md`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, tmpl.content);

    const variables = extractVariables(tmpl.content);

    db.prepare(
      `INSERT INTO templates (id, name, description, contract_type, variable_schema, file_path, is_default, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    ).run(id, tmpl.name, tmpl.description, tmpl.contractType, JSON.stringify(variables), filePath, userId);
  }

  log({ userId, action: 'templates:seed', entityType: 'template', details: JSON.stringify({ count: DEFAULT_TEMPLATES.length }) });
}

export function listTemplates(): Template[] {
  const db = getConnection();
  const rows = db.prepare('SELECT * FROM templates ORDER BY is_default DESC, name ASC').all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    contractType: (r.contract_type as string) ?? undefined,
    variableSchema: (r.variable_schema as string) ?? undefined,
    filePath: r.file_path as string,
    isDefault: Boolean(r.is_default),
  }));
}

export function getTemplate(id: string): TemplateWithVariables | undefined {
  const db = getConnection();
  const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;

  const content = fs.existsSync(row.file_path as string) ? fs.readFileSync(row.file_path as string, 'utf8') : '';
  const variables = row.variable_schema ? JSON.parse(row.variable_schema as string) as string[] : extractVariables(content);

  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? undefined,
    contractType: (row.contract_type as string) ?? undefined,
    variableSchema: row.variable_schema as string,
    filePath: row.file_path as string,
    isDefault: Boolean(row.is_default),
    variables,
    content,
  };
}

export function createCustomTemplate(
  userId: string,
  name: string,
  content: string,
  description?: string,
  contractType?: string,
): Template {
  const db = getConnection();
  const id = crypto.randomUUID();
  const dir = getTemplateDir();
  const fileName = `${id}.md`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, content);

  const variables = extractVariables(content);

  db.prepare(
    `INSERT INTO templates (id, name, description, contract_type, variable_schema, file_path, is_default, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(id, name, description ?? null, contractType ?? null, JSON.stringify(variables), filePath, userId);

  log({ userId, action: 'template:create', entityType: 'template', entityId: id });

  return {
    id,
    name,
    description,
    contractType,
    variableSchema: JSON.stringify(variables),
    filePath,
    isDefault: false,
  };
}

export function deleteTemplate(id: string): void {
  const db = getConnection();
  const row = db.prepare('SELECT file_path, is_default FROM templates WHERE id = ?').get(id) as { file_path: string; is_default: number } | undefined;
  if (!row) return;
  if (row.is_default) throw new Error('Cannot delete a default template');

  if (fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
  db.prepare('DELETE FROM templates WHERE id = ?').run(id);
}

export function generateContractFromTemplate(
  userId: string,
  templateId: string,
  variables: Record<string, string>,
  title: string,
): string {
  const template = getTemplate(templateId);
  if (!template) throw new Error('Template not found');

  const filledContent = fillTemplate(template.content, variables);

  const db = getConnection();
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(
    `INSERT INTO contracts (id, title, status, content, metadata, ai_prompt_version, created_by, created_at, updated_at)
     VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    title,
    filledContent,
    JSON.stringify({ templateId, templateName: template.name, variables }),
    'template-based',
    userId,
    now,
    now,
  );

  log({
    userId,
    action: 'contract:create',
    entityType: 'contract',
    entityId: id,
    details: JSON.stringify({ source: 'template', templateName: template.name }),
  });

  return id;
}

export { extractVariables, fillTemplate };
