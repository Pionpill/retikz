import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { createInspectApiReferenceMdx } from '../../scripts/api-reference/inspect';

describe('Inspect API Reference', () => {
  it('按公开子入口分组，并将 schema 字段委托给可链接的 Schema 参考', async () => {
    for (const lang of ['zh', 'en'] as const) {
      const source = await createInspectApiReferenceMdx(lang);
      const sections = source.split(/^## /m).slice(1);
      expect(sections).toHaveLength(3);
      expect(sections[0]).toContain('`@retikz/inspect`');
      expect(sections[0]).toContain('### defineInspector');
      expect(sections[0]).toContain('(options: RetikzInspectErrorOptions) => RetikzInspectError');
      expect(sections[1]).toContain('`@retikz/inspect/react`');
      expect(sections[1]).toContain('### InspectLayout');
      expect(sections[1]).not.toContain('### createInspectionVanillaDriver');
      expect(sections[2]).toContain('`@retikz/inspect/vanilla`');
      expect(sections[2]).toContain('### createInspectionVanillaDriver');
      for (const schema of [
        'PathInspectOptionsSchema',
        'NodeInspectOptionsSchema',
        'ClipInspectOptionsSchema',
        'ScopeInspectOptionsSchema',
        'CoordinateInspectOptionsSchema',
      ]) {
        const schemaSection = source.split(`### ${schema}\n`)[1]?.split('\n### ')[0];
        expect(schemaSection).toContain(`/kernel/packages/inspect/schema-reference#${schema.toLowerCase()}`);
        expect(schemaSection).not.toContain('```');
      }
      if (lang === 'en') expect(source.replaceAll(/```[\s\S]*?```/g, '')).not.toMatch(/[\u3400-\u9fff]/u);
      await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeTruthy();
    }
  }, 20000);
});
