import { readFileSync } from 'node:fs';

import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

describe('Block public API reference', () => {
  it('keeps bilingual public entries, row alternatives, and runtime extension contracts', async () => {
    for (const lang of ['zh', 'en']) {
      const source = readFileSync(
        new URL(
          `../../src/modules/docs/contents/schematic/graph/block/api-reference/_includes/generated.${lang}.mdx`,
          import.meta.url,
        ),
        'utf8',
      );
      for (const name of [
        'Block / BlockProps',
        'BlockHeader / BlockHeaderProps',
        'BlockSection / BlockSectionProps',
        'BlockRow / BlockRowProps',
        'createBlock / BlockCreateOptions',
        'CodeBlockDefinition',
        'CodeBlockComposeContext',
        'createCodeBlockContribution',
      ])
        expect(source).toContain(`### ${name}`);
      expect(source).not.toMatch(/^### \w+Schema/gm);
      expect(source).toContain('BlockRowCreateOptions');
      expect(source).toContain('compose');
      if (lang === 'en') expect(source).not.toMatch(/[\u3400-\u9fff]/u);
      await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
    }
  });
});
