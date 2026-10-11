import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { parseHeadings } from '@/modules/docs/components/mdx-content/utils';

import { dataTransformApiReferenceConfig } from '../../scripts/api-reference/data-transform';
import { createMergedReferenceMdx } from '../../scripts/api-reference/merged-reference';
import { createApiReferenceMdx } from '../../scripts/api-reference/tex';

const contents = path.resolve(
  import.meta.dirname,
  '../../src/modules/docs/contents/viz/data/transform/reference/_includes',
);
const owner = 'viz/data/transform';
const sources = new Map<string, string>();

describe('合并数据变换参考', () => {
  beforeAll(async () => {
    for (const lang of ['zh', 'en'] as const)
      sources.set(lang, await createApiReferenceMdx(dataTransformApiReferenceConfig, lang));
  }, 120000);

  it.each(['zh', 'en'] as const)('保留 %s 的全部成员与 Schema，能力分组进入目录且页签不嵌套', lang => {
    const api = sources.get(lang)!;
    const schema = readFileSync(path.join(contents, `schemas.${lang}.mdx`), 'utf8');
    const merged = createMergedReferenceMdx(api, schema, owner, lang);
    const originalMembers = [...api.matchAll(/^### (.+)$/gmu)].flatMap(match => match[1].split(' / '));
    const headingNames = [...merged.matchAll(/^#### (.+)$/gmu)].flatMap(match =>
      [...match[1].matchAll(/>([^<]+)<\/ApiSourceLink>/gu)].map(link => link[1]),
    );
    for (const member of originalMembers) expect(headingNames).toContain(member);
    expect([...merged.matchAll(/^#### /gmu)]).toHaveLength(96);
    expect(merged).not.toMatch(/<p>\s*<ApiSourceLink\b/u);
    const schemasOf = (text: string) =>
      [...text.matchAll(/<ZodSchema\b[\s\S]*?name="([^"]+)"/gu)].map(match => match[1]).toSorted();
    expect(schemasOf(merged)).toEqual(schemasOf(schema));
    expect(parseHeadings(merged)).toHaveLength(8);
    expect(parseHeadings(merged).every(heading => heading.level === 2)).toBe(true);
    let depth = 0;
    for (const tag of merged.matchAll(/<DocTabs\b|<\/DocTabs>/gu)) {
      depth += tag[0] === '</DocTabs>' ? -1 : 1;
      expect(depth).toBeGreaterThanOrEqual(0);
      expect(depth).toBeLessThanOrEqual(1);
    }
    expect(depth).toBe(0);
    expect(merged).toContain(
      lang === 'zh' ? 'Schema 不会物化 builtin 默认值' : 'does not materialize the builtin default',
    );
    const title = merged.split(/^#### /gmu)[1].split('\n')[0];
    expect([...title.matchAll(/>([^<]+)<\/ApiSourceLink>/gu)].map(link => link[1])).toEqual([
      'IRDataTransform',
      'TransformSchema',
    ]);
    for (const link of title.matchAll(/<ApiSourceLink\b[^>]+/gu)) {
      const file = link[0].match(/path=\{"([^"]+)"\}/u)![1];
      const line = Number(link[0].match(/startLine=\{(\d+)\}/u)![1]);
      const source = readFileSync(path.resolve(import.meta.dirname, '../../../..', file), 'utf8');
      expect(source.split(/\r?\n/u)[line - 1]).toMatch(/IRDataTransform|TransformSchema/u);
    }
  });

  it('新增公开成员未归组时阻止生成', () => {
    const schema = readFileSync(path.join(contents, 'schemas.zh.mdx'), 'utf8');
    expect(() =>
      createMergedReferenceMdx(`${sources.get('zh')}\n### JsonValue\n\nAdditional contract`, schema, owner, 'zh'),
    ).toThrow('Ungrouped references: viz/data/transform: JsonValue');
  });
});
