import type { TFunction } from 'i18next';

import { describe, expect, it } from 'vitest';

import type { Section } from '@/modules/docs/data';

import { vizSection } from '@/modules/docs/data';
import { buildSidebarCategories, flattenLeaves, isChangelogLocation } from '@/modules/docs/layout';

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

  it('Plot 末尾注册 API 参考与更新日志路由', () => {
    const plotPaths = flattenLeaves('viz', vizSection)
      .map(node => node.path)
      .filter(path => path.startsWith('/viz/plot/'));

    expect(plotPaths.slice(-12)).toEqual([
      '/viz/plot/reference/plot',
      '/viz/plot/reference/encoding',
      '/viz/plot/reference/transform',
      '/viz/plot/reference/mark',
      '/viz/plot/reference/scale',
      '/viz/plot/reference/coordinate',
      '/viz/plot/reference/guide',
      '/viz/plot/reference/layout',
      '/viz/plot/reference/layer',
      '/viz/plot/reference/theme',
      '/viz/plot/reference/runtime',
      '/viz/plot/changelog/v0-1',
    ]);
  });

  it('Data 与 Table 分别在模块末尾注册更新日志，并删除 Viz 发布分区', () => {
    const paths = flattenLeaves('viz', vizSection).map(node => node.path);

    expect(paths).toContain('/viz/data/changelog/v0-1');
    expect(paths).toContain('/viz/table/changelog/v0-1');
    expect(paths.some(path => path.startsWith('/viz/releases/'))).toBe(false);
  });

  it.each(['data', 'table', 'plot'])('识别 Viz %s 的数据驱动更新日志路由', sectionId => {
    expect(isChangelogLocation({ moduleId: 'viz', sectionId, pageId: 'changelog' })).toBe(true);
  });

  it('不再识别旧 Viz 发布更新日志路由', () => {
    expect(isChangelogLocation({ moduleId: 'viz', sectionId: 'releases', pageId: 'changelog' })).toBe(false);
  });
});
