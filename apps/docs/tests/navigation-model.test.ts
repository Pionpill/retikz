import type { TFunction } from 'i18next';

import { describe, expect, it } from 'vitest';

import type { Section } from '@/modules/docs/data';

import { buildSidebarCategories, flattenLeaves } from '@/modules/docs/layout';

const sections: Array<Section> = [
  { pages: [{ id: 'intro', label: 'common.notFound' }] },
  {
    id: 'guide',
    label: 'common.notFound',
    document: true,
    pages: [
      {
        id: 'group',
        label: 'common.notFound',
        children: [
          { id: 'a', label: 'common.notFound' },
          { id: 'b', label: 'common.notFound' },
        ],
      },
    ],
  },
];

describe('layout utils', () => {
  it('按 sidebar 顺序拍平叶子页', () => {
    expect(flattenLeaves('kernel', sections).map(node => node.path)).toEqual([
      '/kernel/intro',
      '/kernel/guide',
      '/kernel/guide/group/a',
      '/kernel/guide/group/b',
    ]);
  });

  it('构建 sidebar 分类并保留 ungrouped 标记', () => {
    const t = ((key: string) => key) as TFunction;
    const categories = buildSidebarCategories(t, 'kernel', sections);
    expect(categories[0]?.ungrouped).toBe(true);
    expect(categories[1]?.value).toBe('guide');
    expect(categories[1]?.path).toBe('/kernel/guide');
    expect(categories[1]?.modules[0]?.children?.map(child => child.value)).toEqual(['a', 'b']);
  });
});
