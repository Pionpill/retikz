import { readFileSync } from 'node:fs';

import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

describe('Block 公共 API 参考', () => {
  it('保留双语公共条目、行替代项和运行时扩展契约', async () => {
    for (const lang of ['zh', 'en']) {
      const source = readFileSync(
        new URL(
          `../../src/modules/docs/contents/schematic/graph/block/reference/_includes/generated.${lang}.mdx`,
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
        for (const member of name.split(' / ')) expect(source).toContain(`>${member}</ApiSourceLink>`);

      expect(source).not.toMatch(/^### /gm);
      expect(source).toContain('BlockRowCreateOptions');
      expect(source).toContain('compose');

      if (lang === 'en') expect(source).not.toMatch(/[\u3400-\u9fff]/u);

      await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
    }
  });
});
