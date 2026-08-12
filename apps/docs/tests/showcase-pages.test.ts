import type { CompileOptions } from '@mdx-js/mdx';

import { compile } from '@mdx-js/mdx';
import { existsSync, readFileSync } from 'node:fs';
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
const scatterExamplePath = (filename: string) =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/scatter/${filename}`);
const bubbleContentPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/bubble/index.${lang}.mdx`);
const sharedApiContentPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/_includes/shared-api.${lang}.mdx`);
const pointContentPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/plot/mark/point/index.${lang}.mdx`);
const compositeConceptPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/kernel/concepts/design/composite/index.${lang}.mdx`);

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
  it.each(['zh', 'en'] as const)('Composite %s 概念页保持 MDX 可编译', async lang => {
    const compiled = String(await compile(readFileSync(compositeConceptPath(lang), 'utf8'), compileOptions));

    expect(compiled).toContain('resolveCompositeDependencies');
    expect(compiled).toContain('CompileOptions.composites');
    expect(compiled).toContain('spatialHandles');
    expect(compiled).toContain('resolveSpatialHandle');
  });

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
              { id: 'bubble', label: 'common.notFound', meta: showcaseMeta('scatter-points', 20) },
              { id: 'scatter', label: 'common.notFound', meta: showcaseMeta('scatter-points', 10) },
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
        metadata: showcaseMeta('scatter-points', 10).showcase,
      },
      {
        path: '/viz/chart/points/bubble',
        segments: ['viz', 'chart', 'points', 'bubble'],
        label: 'common.notFound',
        metadata: showcaseMeta('scatter-points', 20).showcase,
      },
    ]);
  });

  it('从实际 Viz 文档树收集 ADR-04 Scatter 的嵌套路由', () => {
    expect(collectShowcasePages('viz', vizSection)).toContainEqual({
      path: '/viz/chart/points/scatter',
      segments: ['viz', 'chart', 'points', 'scatter'],
      label: 'viz.chartScatter',
      metadata: { family: 'scatter-points', role: 'primary', preview: 'scatter-basic', order: 10 },
    });
  });

  it('从实际 Viz 文档树收集平级 Bubble 概念预览', () => {
    expect(collectShowcasePages('viz', vizSection)).toContainEqual({
      path: '/viz/chart/points/bubble',
      segments: ['viz', 'chart', 'points', 'bubble'],
      label: 'viz.chartBubble',
      metadata: { family: 'scatter-points', role: 'primary', preview: 'bubble-basic', order: 20 },
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

  it('将 Scatter 页面说明为 Chart-native authoring，并保留独立的 Plot 扩展边界', () => {
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
    expect(zh).toContain('`@retikz/chart-react`');
    expect(en).toContain('`@retikz/chart-react`');
    expect(zh).toContain('`ScatterChart`');
    expect(en).toContain('`ScatterChart`');
    expect(zh).not.toContain('基于公开 Plot API 的非契约概念预览');
    expect(en).not.toContain('non-contract conceptual preview built with the public Plot API');
  });

  it('同一 family 的 order 冲突时明确失败', () => {
    const sections: Array<Section> = [
      {
        id: 'chart',
        label: 'common.notFound',
        pages: [
          { id: 'scatter', label: 'common.notFound', meta: showcaseMeta('scatter-points', 10) },
          { id: 'bubble', label: 'common.notFound', meta: showcaseMeta('scatter-points', 10) },
        ],
      },
    ];

    expect(() => collectShowcasePages('viz', sections)).toThrow(
      'Duplicate Showcase order 10 in family "scatter-points"',
    );
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
    ['zh', ['## Chart authoring', '## Presentation', '## Plot extensions']],
    ['en', ['## Chart authoring', '## Presentation', '## Plot extensions']],
  ] as const)('内联展开 %s Scatter 的独有与共享 API，并保持可编译', async (lang, expectedHeadings) => {
    const source = readFileSync(scatterContentPath(lang), 'utf8');
    expect(source).toContain('{/* @include viz/chart/shared-api */}');

    const expanded = await expandMdxIncludes(source, lang);
    const headings = Array.from(expanded.matchAll(/^##\s+(.+)$/gm), match => `## ${match[1]}`);
    const ordered = expectedHeadings.map(heading => headings.indexOf(heading));

    expect(ordered.every(index => index >= 0)).toBe(true);
    expect(ordered).toEqual([...ordered].sort((left, right) => left - right));
    expect(expanded).toContain('`IRChart`');
    expect(expanded).toContain('`ChartProvider`');
    expect(expanded).toContain('`ChartTitle`');
    expect(expanded).not.toMatch(/IRChartShared|createChartComposites|MarkValueProp|NodeShapeChannelValue/);

    const compiled = String(await compile(expanded, compileOptions));
    expect(compiled).toContain('ShowcaseGallery');
    expect(compiled).toContain('h2');
  });

  it.each([
    ['zh', ['## 尺寸与面积', '## Point Mark']],
    ['en', ['## Size and Area', '## Point Mark']],
  ] as const)('%s Bubble 先说明尺寸语义，再复用共享 API', async (lang, expectedHeadings) => {
    const source = readFileSync(bubbleContentPath(lang), 'utf8');
    expect(source).toContain('{/* @include viz/chart/shared-api */}');
    expect(source).toContain('family: scatter-points');
    expect(source).toContain('usage: distribution');
    expect(source).toContain("files: ['bubble-basic', 'bubble-basic.data.ts']");
    expect(source).toContain("size: 'xxl'");
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

  it.each(['zh', 'en'] as const)('Scatter %s 以基础散点为主，并保留两个真实数据使用示例', lang => {
    const source = readFileSync(scatterContentPath(lang), 'utf8');

    expect(source).not.toMatch(/scatter-bubble|Bubble encoding|气泡编码/);
    expect(source.match(/id: 'scatter-basic'/g)).toHaveLength(1);
    expect(source.match(/id: 'scatter-income-life-expectancy'/g)).toHaveLength(1);
    expect(source.match(/id: 'scatter-fertility-work'/g)).toHaveLength(1);
    expect(source).toContain("files: ['scatter-income-life-expectancy', 'scatter-income-life-expectancy.data.ts']");
    expect(source).toContain("controls: { name: 'scatter-income-life-expectancy' }");
  });

  it('Scatter 生育率与女性劳动参与率示例提供完整的双语 preview 文件', () => {
    for (const filename of [
      'scatter-fertility-work.data.ts',
      'scatter-fertility-work.zh.demo.tsx',
      'scatter-fertility-work.en.demo.tsx',
    ]) {
      expect(existsSync(scatterExamplePath(filename)), filename).toBe(true);
    }
  });

  it('Scatter 收入与寿命使用示例提供完整的双语 preview 文件', () => {
    for (const filename of [
      'scatter-income-life-expectancy.data.ts',
      'scatter-income-life-expectancy.controls.ts',
      'scatter-income-life-expectancy.en.controls.ts',
      'scatter-income-life-expectancy.zh.demo.tsx',
      'scatter-income-life-expectancy.en.demo.tsx',
    ]) {
      expect(existsSync(scatterExamplePath(filename)), filename).toBe(true);
    }
  });

  it.each(['zh', 'en'] as const)('%s 共享 API 只陈述当前 Chart 公开契约', lang => {
    const source = readFileSync(sharedApiContentPath(lang), 'utf8');

    expect(source).toContain('`IRChart`');
    expect(source).toContain('`ChartProvider`');
    expect(source).toContain('`ChartTitle`');
    expect(source).toContain('`chartThemeStyles`');
    expect(source).toContain('`plotThemeStyles`');
    expect(source).toMatch(lang === 'zh' ? /静态 adapter/u : /static adapter/u);
    expect(source).not.toMatch(/IRChartShared|createChartComposites/);
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
