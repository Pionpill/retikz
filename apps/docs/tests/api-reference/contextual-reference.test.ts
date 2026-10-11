import { readFileSync } from 'node:fs';
import path from 'node:path';

import { compile } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { expect, it } from 'vitest';

import {
  contextualReferencePages,
  createContextualReferenceMdx,
} from '../../scripts/api-reference/contextual-reference';

it.each(contextualReferencePages)(
  '%s 就地参考保持 Schema 与 demo，重新生成幂等且双语可编译',
  async owner => {
    for (const language of ['zh', 'en'] as const) {
      const source = readFileSync(
        path.resolve(import.meta.dirname, '../../src/modules/docs/contents', owner, `index.${language}.mdx`),
        'utf8',
      );
      const generated = createContextualReferenceMdx(source, owner, language);
      const twice = createContextualReferenceMdx(generated, owner, language);
      expect(twice).toEqual(generated);
      const schemas = (text: string) =>
        [...text.matchAll(/<ZodSchema\b[\s\S]*?name="([^"]+)"/gu)].map(match => match[1]);
      expect(schemas(generated)).toEqual(schemas(source));
      expect(generated.match(/<ComponentPreview\b/gu)).toHaveLength(source.match(/<ComponentPreview\b/gu)!.length);
      expect(generated).not.toMatch(/^#### \w+$/gmu);
      expect(generated).toContain('defaultValue="members"');
      await expect(compile(generated, { remarkPlugins: [remarkFrontmatter, remarkGfm] })).resolves.toBeDefined();
    }
  },
  30000,
);
