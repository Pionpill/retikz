import type { TFunction } from 'i18next';

import { describe, expect, it } from 'vitest';

import type { Section } from '@/modules/docs/data';

import { DocDifficulty, vizSection } from '@/modules/docs/data';
import {
  buildSidebarCategories,
  filterSectionsByDifficulty,
  flattenLeaves,
  isChangelogLocation,
  resolvePageNavigation,
} from '@/modules/docs/layout';

const sections: Array<Section> = [
  { pages: [{ id: 'intro', label: 'common.notFound', difficulty: DocDifficulty.Beginner }] },
  {
    id: 'guide',
    label: 'common.notFound',
    document: true,
    pages: [
      {
        id: 'group',
        label: 'common.notFound',
        children: [
          { id: 'a', label: 'common.notFound', difficulty: DocDifficulty.Beginner },
          { id: 'b', label: 'common.notFound', difficulty: DocDifficulty.Internals },
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
    expect(categories[0]?.modules[0]?.difficulty).toBe(DocDifficulty.Beginner);
    expect(categories[1]?.modules[0]?.difficulty).toBeUndefined();
    expect(categories[1]?.modules[0]?.children?.[1]?.difficulty).toBe(DocDifficulty.Internals);
  });

  it('当前页面被难度过滤时不提供上一篇或下一篇', () => {
    const filtered = filterSectionsByDifficulty(sections, DocDifficulty.Beginner);
    const navigation = resolvePageNavigation(
      { moduleId: 'kernel', sectionId: 'guide', pageId: 'group', subPageId: 'b' },
      filtered,
    );

    expect(navigation).toEqual({ prev: null, next: null });
  });

  it('将 Showcase 图标放在一级页面条目而非分组标题', () => {
    const t = ((key: string) => key) as TFunction;
    const categories = buildSidebarCategories(t, 'viz', vizSection);
    const chart = categories.find(category => category.value === 'chart');
    const points = chart?.modules.find(module => module.value === 'points');

    expect(points?.Icon).toBeDefined();
    expect(points?.children?.map(child => child.value)).toEqual(['scatter', 'bubble', 'connected-scatter']);
  });

  it('Plot 末尾注册 API 参考与更新日志路由', () => {
    const plotPaths = flattenLeaves('viz', vizSection)
      .map(node => node.path)
      .filter(path => path.startsWith('/viz/plot/'));

    expect(plotPaths.slice(-13)).toEqual([
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
      '/viz/plot/changelog/v0-2',
      '/viz/plot/changelog/v0-1',
    ]);
  });

  it('Data 与 Table 分别在模块末尾注册更新日志，并删除 Viz 发布分区', () => {
    const paths = flattenLeaves('viz', vizSection).map(node => node.path);

    expect(paths).toContain('/viz/data/changelog/v0-1');
    expect(paths).toContain('/viz/table/changelog/v0-1');
    expect(paths.some(path => path.startsWith('/viz/releases/'))).toBe(false);
  });

  it('在 Chart 下并列组织点图 Showcase 与共享图形模型', () => {
    expect(vizSection.map(section => section.id).filter(Boolean)).toEqual(['data', 'chart', 'table', 'plot']);

    const chart = vizSection.find(section => section.id === 'chart');
    const points = chart?.pages.find(page => page.id === 'points');
    const scatter = points?.children?.find(page => page.id === 'scatter');
    const bubble = points?.children?.find(page => page.id === 'bubble');
    const connectedScatter = points?.children?.find(page => page.id === 'connected-scatter');
    const model = chart?.pages.find(page => page.id === 'model');
    const chartPaths = flattenLeaves('viz', vizSection)
      .map(node => node.path)
      .filter(path => path.startsWith('/viz/chart/') && !path.includes('/changelog/'));

    expect(points?.meta).toMatchObject({ pageType: 'group', capability: 'chart.points' });
    expect(scatter?.meta).toMatchObject({
      pageType: 'concept',
      layout: 'showcase',
      capability: 'showcase.scatter',
      showcase: { family: 'scatter-points', role: 'primary', preview: 'scatter-fertility-work', order: 10 },
    });
    expect(bubble?.meta).toMatchObject({
      pageType: 'concept',
      layout: 'showcase',
      capability: 'showcase.bubble',
      showcase: { family: 'scatter-points', role: 'primary', preview: 'bubble-basic', order: 20 },
    });
    expect(connectedScatter?.meta).toMatchObject({
      pageType: 'concept',
      layout: 'showcase',
      capability: 'showcase.connected-scatter',
      showcase: { family: 'scatter-points', role: 'primary', preview: 'connected-scatter-basic', order: 40 },
    });
    expect(model?.meta).toMatchObject({ pageType: 'concept', capability: 'chart.model' });
    expect(model?.children?.map(page => page.id)).toEqual(['structure', 'authoring', 'presentation', 'plot']);
    expect(chartPaths).toEqual([
      '/viz/chart/points/scatter',
      '/viz/chart/points/bubble',
      '/viz/chart/points/connected-scatter',
      '/viz/chart/model/structure',
      '/viz/chart/model/authoring',
      '/viz/chart/model/presentation',
      '/viz/chart/model/plot',
    ]);
    expect(chartPaths).not.toContain('/viz/chart/scatter');
  });

  it.each(['data', 'table', 'plot'])('识别 Viz %s 的数据驱动更新日志路由', sectionId => {
    expect(isChangelogLocation({ moduleId: 'viz', sectionId, pageId: 'changelog' })).toBe(true);
  });

  it('不再识别旧 Viz 发布更新日志路由', () => {
    expect(isChangelogLocation({ moduleId: 'viz', sectionId: 'releases', pageId: 'changelog' })).toBe(false);
  });
});
