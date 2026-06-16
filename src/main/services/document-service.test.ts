import { describe, it, expect } from 'vitest';
import { parseMarkdownToContentJson } from './document-service';

describe('document-service', () => {
  describe('parseMarkdownToContentJson', () => {
    it('parses headings', () => {
      const md = '# Title\n## Section\n### Subsection';
      const blocks = parseMarkdownToContentJson(md);
      expect(blocks.find((b) => b.type === 'h1')?.text).toBe('Title');
      expect(blocks.find((b) => b.type === 'h2')?.text).toBe('Section');
      expect(blocks.find((b) => b.type === 'h3')?.text).toBe('Subsection');
    });

    it('parses paragraphs as body blocks', () => {
      const md = 'This is a paragraph.';
      const blocks = parseMarkdownToContentJson(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe('body');
      expect(blocks[0].text).toContain('This is a paragraph');
    });

    it('parses unordered lists as bullet blocks', () => {
      const md = '- First item\n- Second item\n- Third item';
      const blocks = parseMarkdownToContentJson(md);
      const bullets = blocks.filter((b) => b.type === 'bullet');
      expect(bullets.length).toBe(3);
      expect(bullets[0].text).toContain('First item');
    });

    it('parses ordered lists as numbered blocks', () => {
      const md = '1. First\n2. Second\n3. Third';
      const blocks = parseMarkdownToContentJson(md);
      const numbered = blocks.filter((b) => b.type === 'numbered');
      expect(numbered.length).toBe(3);
    });

    it('parses horizontal rules as dividers', () => {
      const md = 'Before\n\n---\n\nAfter';
      const blocks = parseMarkdownToContentJson(md);
      expect(blocks.some((b) => b.type === 'divider')).toBe(true);
    });

    it('parses code blocks', () => {
      const md = '```\nconst x = 1;\n```';
      const blocks = parseMarkdownToContentJson(md);
      expect(blocks.some((b) => b.type === 'code')).toBe(true);
    });

    it('handles mixed content correctly', () => {
      const md = `# Contract Title

This is the intro paragraph.

## Terms

- Term one
- Term two

1. Numbered item`;
      const blocks = parseMarkdownToContentJson(md);
      expect(blocks.some((b) => b.type === 'h1')).toBe(true);
      expect(blocks.some((b) => b.type === 'h2')).toBe(true);
      expect(blocks.some((b) => b.type === 'body')).toBe(true);
      expect(blocks.filter((b) => b.type === 'bullet').length).toBe(2);
      expect(blocks.filter((b) => b.type === 'numbered').length).toBe(1);
    });

    it('handles empty markdown', () => {
      const blocks = parseMarkdownToContentJson('');
      expect(blocks.length).toBe(0);
    });
  });
});
