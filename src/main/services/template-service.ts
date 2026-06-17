import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { getConnection } from '../database/connection';
import { log } from './audit-service';
import { rowToTemplate } from '../database/mappers';
import { DEFAULT_TEMPLATES, extractVariables, fillTemplate } from '../data/default-templates';
import { getDefaultAppPaths } from '../infra/app-paths';
import type { Template } from '../../shared/types';

export interface TemplateWithVariables extends Template {
  variables: string[];
  content: string;
}

function getTemplateDir(): string {
  const dir = getDefaultAppPaths().getTemplatesDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
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
  return rows.map(rowToTemplate);
}

export function getTemplate(id: string): TemplateWithVariables | undefined {
  const db = getConnection();
  const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;

  const base = rowToTemplate(row);
  const content = fs.existsSync(base.filePath) ? fs.readFileSync(base.filePath, 'utf8') : '';
  const variables = base.variableSchema ? JSON.parse(base.variableSchema) as string[] : extractVariables(content);

  return {
    ...base,
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
    createdBy: userId,
    createdAt: Date.now(),
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

  db.transaction(() => {
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
  })();

  return id;
}

export { extractVariables, fillTemplate };
