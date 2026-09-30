import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { expect, it } from 'vitest';

import { createApiReferenceMdx } from '../../scripts/api-reference/tex';

it('JSDoc 正文可编译为 MDX，类型签名过滤注释并保留代码片段', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'retikz-mdx-prose-'));
  try {
    const entry = join(directory, 'index.ts');
    const tsconfigPath = join(directory, 'tsconfig.json');
    writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: { strict: true }, files: ['./index.ts'] }), 'utf8');
    writeFileSync(
      entry,
      `/** Tension <1 uses { x, y }; preserve \`Map<T>\` */
export interface Options {
  /** Offset { x, y } <1; \`Array<T>\` */
  offset: number;
  /** Transform a point */
  transform: (
    x: number,
    y: number,
  ) => number;
}
/** Create a configured value
 * @param options Configuration, defaulting to {}; retries defaults to 3
 * @returns The retry budget
 */
export const configured = (options: Readonly<{
  /** 重试次数
   * @default 3
   */
  retries?: number;
}> = {}): number => options.retries ?? 3;`,
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
      expect(source).toContain('`(x: number, y: number) => number`');
      expect(source).toContain('transform: (x: number, y: number) => number;');
      expect(source).not.toContain('`(<br />');
      expect(source).toContain('retries?: number;');
      expect(source).toContain('Configuration, defaulting to &#123;&#125;; retries defaults to 3');
      expect(source).not.toContain('重试次数');
      expect(source).not.toContain('@default');
      await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
