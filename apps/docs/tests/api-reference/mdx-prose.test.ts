import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { expect, it } from 'vitest';

import { createApiReferenceMdx } from '../../scripts/api-reference/tex';

it('JSDoc 正文中的比较符和对象字面量可编译为 MDX，代码片段保持原文', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'retikz-mdx-prose-'));
  try {
    const entry = join(directory, 'index.ts');
    const tsconfigPath = join(directory, 'tsconfig.json');
    writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: { strict: true }, files: ['./index.ts'] }), 'utf8');
    writeFileSync(
      entry,
      '/** Tension <1 uses { x, y }; preserve `Map<T>` */\nexport interface Options {\n/** Offset { x, y } <1; `Array<T>` */\noffset: number;\n}',
      'utf8',
    );
    for (const lang of ['zh', 'en'] as const) {
      const source = await createApiReferenceMdx(
        {
          packageName: 'mdx-prose-fixture',
          packageDirectory: directory,
          tsconfigPath,
          entries: [{ source: entry, title: { zh: 'Options', en: 'Options' } }],
          translate: text => text,
        },
        lang,
      );
      expect(source).toContain('Tension &lt;1 uses &#123; x, y &#125;; preserve `Map<T>`');
      expect(source).toContain('Offset &#123; x, y &#125; &lt;1; `Array<T>`');
      await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
