import type { CompileOptions } from '@mdx-js/mdx';

import { compile } from '@mdx-js/mdx';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import rehypeMdxCodeProps from 'rehype-mdx-code-props';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import { describe, expect, it } from 'vitest';

import type { Section } from '@/modules/docs/data';

import { collectShowcasePages } from '@/modules/docs/components/showcase';
import { vizSection } from '@/modules/docs/data';
import { expandMdxIncludes } from '@/modules/docs/lib';

const scatterContentPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/scatter/index.${lang}.mdx`);
const bubbleContentPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/bubble/index.${lang}.mdx`);
const sharedApiContentPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/_includes/shared-api.${lang}.mdx`);
const pointContentPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/plot/mark/point/index.${lang}.mdx`);

const compileOptions: CompileOptions = {
  outputFormat: 'function-body',
  development: false,
  remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
  rehypePlugins: [rehypeSlug, [rehypeMdxCodeProps, { tagName: 'code' }]],
};

const showcaseMeta = (family: string, order: number) => ({
  pageType: 'component' as const,
  audience: 'user' as const,
  capability: `chart.${family}.${order}`,
  sourceOfTruth: 'runtime' as const,
  layout: 'showcase' as const,
  showcase: { family, role: 'primary' as const, preview: `preview-${order}`, order },
});

describe('collectShowcasePages', () => {
  it('按 family 与 order 提供稳定的 Showcase 页面关系', () => {
    const sections: Array<Section> = [
      {
        id: 'chart',
        label: 'common.notFound',
        pages: [
          {
            id: 'points',
            label: 'common.notFound',
            children: [
              { id: 'bubble', label: 'common.notFound', meta: showcaseMeta('points', 20) },
              { id: 'scatter', label: 'common.notFound', meta: showcaseMeta('points', 10) },
            ],
          },
          {
            id: 'intervals',
            label: 'common.notFound',
            children: [{ id: 'bar', label: 'common.notFound', meta: showcaseMeta('intervals', 10) }],
          },
        ],
      },
    ];

    expect(collectShowcasePages('viz', sections)).toEqual([
      {
        path: '/viz/chart/intervals/bar',
        segments: ['viz', 'chart', 'intervals', 'bar'],
        label: 'common.notFound',
        metadata: showcaseMeta('intervals', 10).showcase,
      },
      {
        path: '/viz/chart/points/scatter',
        segments: ['viz', 'chart', 'points', 'scatter'],
        label: 'common.notFound',
        metadata: showcaseMeta('points', 10).showcase,
      },
      {
        path: '/viz/chart/points/bubble',
        segments: ['viz', 'chart', 'points', 'bubble'],
        label: 'common.notFound',
        metadata: showcaseMeta('points', 20).showcase,
      },
    ]);
  });

  it('从实际 Viz 文档树收集 ADR-04 Scatter 的嵌套路由', () => {
    expect(collectShowcasePages('viz', vizSection)).toContainEqual({
      path: '/viz/chart/points/scatter',
      segments: ['viz', 'chart', 'points', 'scatter'],
      label: 'viz.chartScatter',
      metadata: { family: 'points', role: 'primary', preview: 'scatter-basic', order: 10 },
    });
  });

  it('从实际 Viz 文档树收集平级 Bubble 概念预览', () => {
    expect(collectShowcasePages('viz', vizSection)).toContainEqual({
      path: '/viz/chart/points/bubble',
      segments: ['viz', 'chart', 'points', 'bubble'],
      label: 'viz.chartBubble',
      metadata: { family: 'points', role: 'primary', preview: 'bubble-basic', order: 20 },
    });

    const chartSection = vizSection.find(section => section.id === 'chart');
    const pointsPage = chartSection?.pages.find(page => page.id === 'points');
    const bubblePage = pointsPage?.children?.find(page => page.id === 'bubble');

    expect(bubblePage?.meta).toMatchObject({
      pageType: 'concept',
      audience: 'user',
      capability: 'showcase.bubble',
      sourceOfTruth: 'docs',
      layout: 'showcase',
    });
  });

  it('将 gate 前的 Scatter 页面保持为公开 Plot API 驱动的非契约概念预览', () => {
    const chartSection = vizSection.find(section => section.id === 'chart');
    const pointsPage = chartSection?.pages.find(page => page.id === 'points');
    const scatterPage = pointsPage?.children?.find(page => page.id === 'scatter');

    expect(scatterPage?.meta).toMatchObject({
      pageType: 'concept',
      capability: 'showcase.scatter',
      sourceOfTruth: 'docs',
      layout: 'showcase',
    });

    const zh = readFileSync(scatterContentPath('zh'), 'utf8');
    const en = readFileSync(scatterContentPath('en'), 'utf8');
    expect(zh).toContain('基于公开 Plot API 的非契约概念预览');
    expect(en).toContain('non-contract conceptual preview built with the public Plot API');
    expect(zh).not.toMatch(/Chart 输入|Scatter 预设|recipe 保留|Chart 预设负责/);
    expect(en).not.toMatch(/Chart input|Scatter preset|recipe reserves|Chart preset owns/);
  });

  it('同一 family 的 order 冲突时明确失败', () => {
    const sections: Array<Section> = [
      {
        id: 'chart',
        label: 'common.notFound',
        pages: [
          { id: 'scatter', label: 'common.notFound', meta: showcaseMeta('points', 10) },
          { id: 'bubble', label: 'common.notFound', meta: showcaseMeta('points', 10) },
        ],
      },
    ];

    expect(() => collectShowcasePages('viz', sections)).toThrow('Duplicate Showcase order 10 in family "points"');
  });

  it('Showcase 布局缺少关系元数据时明确失败', () => {
    const sections: Array<Section> = [
      {
        id: 'chart',
        label: 'common.notFound',
        pages: [
          {
            id: 'scatter',
            label: 'common.notFound',
            meta: {
              pageType: 'component',
              audience: 'user',
              capability: 'chart.scatter',
              sourceOfTruth: 'runtime',
              layout: 'showcase',
            },
          },
        ],
      },
    ];

    expect(() => collectShowcasePages('viz', sections)).toThrow(
      'Showcase page "/viz/chart/scatter" requires showcase metadata',
    );
  });

  it.each([
    [
      'zh',
      [
        '## Point Mark',
        '## Axis',
        '## Legend',
        '## Label',
        '## Scale',
        '## Transform',
        '## Theme 与 Layout',
        '## Additional Marks',
      ],
    ],
    [
      'en',
      [
        '## Point Mark',
        '## Axis',
        '## Legend',
        '## Label',
        '## Scale',
        '## Transform',
        '## Theme and Layout',
        '## Additional Marks',
      ],
    ],
  ] as const)('内联展开 %s Scatter 的独有与共享 API，并保持可编译', async (lang, expectedHeadings) => {
    const source = readFileSync(scatterContentPath(lang), 'utf8');
    expect(source).toContain('{/* @include viz/chart/shared-api */}');

    const expanded = await expandMdxIncludes(source, lang);
    const headings = Array.from(expanded.matchAll(/^##\s+(.+)$/gm), match => `## ${match[1]}`);
    const ordered = expectedHeadings.map(heading => headings.indexOf(heading));

    expect(ordered.every(index => index >= 0)).toBe(true);
    expect(ordered).toEqual([...ordered].sort((left, right) => left - right));
    expect(expanded).toContain("`ScaleProps['type']`");
    expect(expanded).toContain("'density'");
    expect(expanded).toContain("'smooth'");
    expect(expanded).not.toMatch(/MarkValueProp<|NodeShapeChannelValue|ExtensionChannelProp|CoreNodeChannelProps/);

    const compiled = String(await compile(expanded, compileOptions));
    expect(compiled).toContain('ShowcaseGallery');
    expect(compiled).toContain('h2');
  });

  it.each([
    ['zh', ['## 尺寸与面积', '## Point Mark', '## Axis']],
    ['en', ['## Size and Area', '## Point Mark', '## Axis']],
  ] as const)('%s Bubble 先说明尺寸语义，再复用共享 API', async (lang, expectedHeadings) => {
    const source = readFileSync(bubbleContentPath(lang), 'utf8');
    expect(source).toContain('{/* @include viz/chart/shared-api */}');
    expect(source).toContain('family: point');
    expect(source).toContain('usage: distribution');
    expect(source).toContain("files: ['bubble-basic', 'bubble-basic.data.ts']");
    expect(source).toContain("size: 'xl'");
    expect(source).not.toMatch(/BubbleChartSpec|BubbleChartRecipe|@retikz\/chart-react|@retikz\/chart-vanilla/);

    const expanded = await expandMdxIncludes(source, lang);
    const headings = Array.from(expanded.matchAll(/^##\s+(.+)$/gm), match => `## ${match[1]}`);
    const ordered = expectedHeadings.map(heading => headings.indexOf(heading));

    expect(ordered.every(index => index >= 0)).toBe(true);
    expect(ordered).toEqual([...ordered].sort((left, right) => left - right));
    expect(source.match(/id: 'bubble-basic'/g)).toHaveLength(1);

    const compiled = String(await compile(expanded, compileOptions));
    expect(compiled).toContain('ShowcaseGallery');
    expect(compiled).toContain('h2');
  });

  it.each(['zh', 'en'] as const)('Scatter %s 不再把 Bubble 当成同类型示例', lang => {
    const source = readFileSync(scatterContentPath(lang), 'utf8');

    expect(source).not.toMatch(/scatter-bubble|Bubble encoding|气泡编码/);
    expect(source.match(/id: 'scatter-basic'/g)).toHaveLength(1);
  });

  it.each(['zh', 'en'] as const)('%s 共享标签 API 使用真实默认值', lang => {
    const source = readFileSync(sharedApiContentPath(lang), 'utf8');

    expect(source).toMatch(/\| `labelPosition`[^\n]+\| `top`\s+\|/);
    expect(source).toMatch(/\| `labelKeepUpright`[^\n]+\| `false`\s+\|/);
  });

  it.each([
    ['zh', /负数.+报错/u],
    ['en', /negative.+error/iu],
  ] as const)('%s 尺寸文档覆盖负数错误与 descriptor 来源', (lang, negativePattern) => {
    const bubble = readFileSync(bubbleContentPath(lang), 'utf8');
    const point = readFileSync(pointContentPath(lang), 'utf8');

    expect(bubble).toMatch(negativePattern);
    expect(point).toMatch(negativePattern);
    expect(point).toContain("path: 'packages/viz/plot/src/providers/channel/features/node.ts'");
  });
});
