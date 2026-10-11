import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { manualReferencePages } from '../../scripts/api-reference/manual-reference-pages';
import { referenceGroups } from '../../scripts/api-reference/reference-groups';

const contents = path.resolve(import.meta.dirname, '../../src/modules/docs/contents');
const directories = [
  ...Object.keys(referenceGroups).map(owner =>
    existsSync(path.join(contents, owner, 'reference/_includes/generated.zh.mdx')) ? `${owner}/reference` : owner,
  ),
  ...manualReferencePages.map(page => page.owner),
];

describe('全站合并参考产物', () => {
  it.each(directories)(
    '%s 保留双语 Schema、标题源码入口与单层页签，并可编译',
    async directory => {
      for (const language of ['zh', 'en']) {
        const include = path.join(contents, directory, '_includes');
        const generated = readFileSync(path.join(include, `generated.${language}.mdx`), 'utf8');
        const schemaFile = path.join(include, `schemas.${language}.mdx`);
        const schemas = existsSync(schemaFile) ? readFileSync(schemaFile, 'utf8') : '';
        const schemaNames = (source: string) =>
          [...source.matchAll(/<ZodSchema\b[\s\S]*?name="([^"]+)"/gu)].map(match => match[1]).toSorted();
        expect(schemaNames(generated)).toEqual(schemaNames(schemas));
        const headings = [...generated.matchAll(/^#### (.+)$/gmu)];
        if (
          schemaNames(schemas).length ||
          !existsSync(schemaFile) ||
          readFileSync(path.join(include, `members.${language}.mdx`), 'utf8').trim()
        )
          expect(headings.length).toBeGreaterThan(0);
        expect(headings.every(heading => heading[1].startsWith('<ApiSourceLink '))).toBe(true);
        expect(generated).not.toMatch(/^<p>\s*<ApiSourceLink\b/gmu);
        let depth = 0;
        for (const tag of generated.matchAll(/<DocTabs\b|<\/DocTabs>/gu)) {
          depth += tag[0] === '</DocTabs>' ? -1 : 1;
          expect(depth).toBeGreaterThanOrEqual(0);
          expect(depth).toBeLessThanOrEqual(1);
        }
        expect(depth).toBe(0);
        await expect(compile(generated, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
      }
    },
    30000,
  );

  it('独立参考删除旧页面且不设阅读难度', () => {
    for (const directory of directories.filter(item => item.endsWith('/reference'))) {
      for (const language of ['zh', 'en']) {
        expect(readFileSync(path.join(contents, directory, `index.${language}.mdx`), 'utf8')).not.toMatch(
          /^difficulty:/mu,
        );
        const owner = path.dirname(directory);
        expect(existsSync(path.join(contents, owner, `api-reference/index.${language}.mdx`))).toBe(false);
        expect(existsSync(path.join(contents, owner, `schema-reference/index.${language}.mdx`))).toBe(false);
      }
    }
  });
});
