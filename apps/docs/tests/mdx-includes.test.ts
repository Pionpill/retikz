import { describe, expect, it } from 'vitest';

import { createMdxIncludeRegistry, expandMdxIncludes } from '@/modules/docs/lib';

const sharedApiEntries = [
  ['../contents/viz/chart/_includes/shared-api.zh.mdx', () => Promise.resolve('## 通用 API\n\n共享中文内容。')],
  [
    '../contents/viz/chart/_includes/shared-api.en.mdx',
    () => Promise.resolve('## Shared API\n\nShared English content.'),
  ],
] as const;

describe('MDX includes', () => {
  it('expands the requested language without changing surrounding MDX', async () => {
    const registry = createMdxIncludeRegistry(sharedApiEntries);

    await expect(
      expandMdxIncludes('## Point Mark\n\nBefore.\n\n{/* @include viz/chart/shared-api */}\n\nAfter.', 'zh', registry),
    ).resolves.toBe('## Point Mark\n\nBefore.\n\n## 通用 API\n\n共享中文内容。\n\nAfter.');
    await expect(expandMdxIncludes('{/* @include viz/chart/shared-api */}', 'en', registry)).resolves.toBe(
      '## Shared API\n\nShared English content.',
    );
  });

  it('expands every marker in authored order', async () => {
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

  it('fails loud for an unknown include or a missing language', async () => {
    const registry = createMdxIncludeRegistry(sharedApiEntries.slice(0, 1));

    await expect(expandMdxIncludes('{/* @include viz/chart/missing */}', 'zh', registry)).rejects.toThrow(
      'Unknown MDX include "viz/chart/missing"',
    );
    await expect(expandMdxIncludes('{/* @include viz/chart/shared-api */}', 'en', registry)).rejects.toThrow(
      'MDX include "viz/chart/shared-api" has no "en" source',
    );
  });

  it('rejects duplicate name and language sources when building the registry', () => {
    expect(() =>
      createMdxIncludeRegistry([
        ...sharedApiEntries,
        ['../contents/viz/chart/_includes/shared-api.zh.mdx', () => Promise.resolve('duplicate')],
      ]),
    ).toThrow('Duplicate MDX include "viz/chart/shared-api" for language "zh"');
  });

  it('leaves ordinary MDX unchanged when it has no include marker', async () => {
    const registry = createMdxIncludeRegistry(sharedApiEntries);

    await expect(expandMdxIncludes('## Point Mark\n\nNo shared fragment.', 'zh', registry)).resolves.toBe(
      '## Point Mark\n\nNo shared fragment.',
    );
  });
});
