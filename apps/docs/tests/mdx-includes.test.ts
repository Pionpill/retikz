import { describe, expect, it } from 'vitest';

import { createMdxIncludeRegistry, expandMdxIncludes } from '@/modules/docs/lib';

const sharedApiEntries = [
  ['../contents/viz/chart/_includes/shared-api.zh.mdx', () => Promise.resolve('## 通用 API\n\n共享中文内容。')],
  [
    '../contents/viz/chart/_includes/shared-api.en.mdx',
    () => Promise.resolve('## Shared API\n\nShared English content.'),
  ],
] as const;

describe('MDX 内容引用', () => {
  it('扩展请求的语言而不改变周围的 MDX', async () => {
    const registry = createMdxIncludeRegistry(sharedApiEntries);

    await expect(
      expandMdxIncludes('## Point Mark\n\nBefore.\n\n{/* @include viz/chart/shared-api */}\n\nAfter.', 'zh', registry),
    ).resolves.toBe('## Point Mark\n\nBefore.\n\n## 通用 API\n\n共享中文内容。\n\nAfter.');
    await expect(expandMdxIncludes('{/* @include viz/chart/shared-api */}', 'en', registry)).resolves.toBe(
      '## Shared API\n\nShared English content.',
    );
  });

  it('按编写顺序扩展每个标记', async () => {
    const registry = createMdxIncludeRegistry([
      ...sharedApiEntries,
      ['../contents/viz/chart/_includes/notes.zh.mdx', () => Promise.resolve('## 注意事项')],
    ]);

    await expect(
      expandMdxIncludes(
        '{/* @include viz/chart/shared-api */}\n\nBody.\n\n{/* @include viz/chart/notes */}',
        'zh',
        registry,
      ),
    ).resolves.toBe('## 通用 API\n\n共享中文内容。\n\nBody.\n\n## 注意事项');
  });

  it('由于未知包含或缺少语言而失败', async () => {
    const registry = createMdxIncludeRegistry(sharedApiEntries.slice(0, 1));

    await expect(expandMdxIncludes('{/* @include viz/chart/missing */}', 'zh', registry)).rejects.toThrow(
      'Unknown MDX include "viz/chart/missing"',
    );
    await expect(expandMdxIncludes('{/* @include viz/chart/shared-api */}', 'en', registry)).rejects.toThrow(
      'MDX include "viz/chart/shared-api" has no "en" source',
    );
  });

  it('构建注册表时拒绝重复的名称和语言源', () => {
    expect(() =>
      createMdxIncludeRegistry([
        ...sharedApiEntries,
        ['../contents/viz/chart/_includes/shared-api.zh.mdx', () => Promise.resolve('duplicate')],
      ]),
    ).toThrow('Duplicate MDX include "viz/chart/shared-api" for language "zh"');
  });

  it('当普通 MDX 没有包含标记时，保持不变', async () => {
    const registry = createMdxIncludeRegistry(sharedApiEntries);

    await expect(expandMdxIncludes('## Point Mark\n\nNo shared fragment.', 'zh', registry)).resolves.toBe(
      '## Point Mark\n\nNo shared fragment.',
    );
  });
});
