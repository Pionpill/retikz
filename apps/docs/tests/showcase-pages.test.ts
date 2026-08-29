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

const scatterContentPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/scatter/index.${lang}.mdx`);
const scatterExamplePath = (filename: string) =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/scatter/${filename}`);
const bubbleContentPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/bubble/index.${lang}.mdx`);
const bubbleExamplePath = (filename: string) =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/bubble/${filename}`);
const regressionContentPath = (lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/regression/index.${lang}.mdx`);
const regressionExamplePath = (filename: string) =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/regression/${filename}`);
const chartModelContentPath = (
  page: 'index' | 'structure' | 'authoring' | 'presentation' | 'plot',
  lang: 'zh' | 'en',
) =>
  resolve(
    process.cwd(),
    `src/modules/docs/contents/viz/chart/model/${page === 'index' ? '' : `${page}/`}index.${lang}.mdx`,
  );
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

const readRequiredFile = (path: string): string => {
  expect(existsSync(path), path).toBe(true);
  return readFileSync(path, 'utf8');
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

    expect(compiled).toContain('resolveCoreProviderDependencies');
    expect(compiled).toContain('CoreProviderContribution');
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
            children: [{ id: 'scatter', label: 'common.notFound', meta: showcaseMeta('scatter-points', 10) }],
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
    ]);
  });

  it('从实际 Viz 文档树收集 ADR-04 Scatter 的嵌套路由', () => {
    expect(collectShowcasePages('viz', vizSection)).toContainEqual({
      path: '/viz/chart/points/scatter',
      segments: ['viz', 'chart', 'points', 'scatter'],
      label: 'viz.chartScatter',
      metadata: { family: 'scatter-points', role: 'primary', preview: 'scatter-fertility-work', order: 10 },
    });
  });

  it('从实际 Viz 文档树收集 Bubble 的嵌套路由', () => {
    expect(collectShowcasePages('viz', vizSection)).toContainEqual({
      path: '/viz/chart/points/bubble',
      segments: ['viz', 'chart', 'points', 'bubble'],
      label: 'viz.chartBubble',
      metadata: { family: 'scatter-points', role: 'primary', preview: 'bubble-basic', order: 20 },
    });
  });

  it('从实际 Viz 文档树收集 Regression 的嵌套路由', () => {
    expect(collectShowcasePages('viz', vizSection)).toContainEqual({
      path: '/viz/chart/points/regression',
      segments: ['viz', 'chart', 'points', 'regression'],
      label: 'viz.chartRegression',
      metadata: { family: 'scatter-points', role: 'primary', preview: 'regression-basic', order: 30 },
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
    expect(zh).toContain('`@retikz/chart-react/point/scatter`');
    expect(en).toContain('`@retikz/chart-react/point/scatter`');
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
          { id: 'other', label: 'common.notFound', meta: showcaseMeta('scatter-points', 10) },
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

  it.each(['zh', 'en'] as const)('Scatter %s 保留类型语义并链接共享模型', async lang => {
    const source = readFileSync(scatterContentPath(lang), 'utf8');
    expect(source).not.toContain('@include viz/chart/shared-api');
    expect(source).toContain('/viz/chart/model/authoring');
    expect(source).toContain('/viz/chart/model/plot');
    expect(source).not.toMatch(/IRChartShared|createChartComposites|MarkValueProp|NodeShapeChannelValue/);

    const compiled = String(await compile(source, compileOptions));
    expect(compiled).toContain('ShowcaseGallery');
    expect(compiled).toContain('h2');
  });

  it.each(['zh', 'en'] as const)('Bubble %s 保留必需尺寸字段语义并保持 MDX 可编译', async lang => {
    const source = readFileSync(bubbleContentPath(lang), 'utf8');
    expect(source).toContain('`BubbleChart`');
    expect(source).toContain('`BubbleEncodings.size`');
    expect(source).toContain('/viz/chart/points/scatter');

    const compiled = String(await compile(source, compileOptions));
    expect(compiled).toContain('ShowcaseGallery');
    expect(compiled).toContain('h2');
  });

  it.each(['zh', 'en'] as const)('Regression %s 覆盖精确 API、失败边界与 Plot escape hatch', async lang => {
    const source = readRequiredFile(regressionContentPath(lang));

    for (const publicName of [
      '`@retikz/chart/point/regression`',
      '`@retikz/chart-react/point/regression`',
      '`@retikz/chart-vanilla/point/regression`',
      '`RegressionChart`',
      '`RegressionEncodings`',
      '`RegressionProperties`',
      '`RegressionMark`',
      '`createRegressionChart`',
      '`normalizeRegressionChart`',
      '`SmoothTransformSchema`',
    ]) {
      expect(source, publicName).toContain(publicName);
    }
    for (const method of ['linear', 'quadratic', 'polynomial', 'logarithmic', 'exponential', 'power']) {
      expect(source, method).toContain(`\`${method}\``);
    }
    expect(source).toContain('/viz/plot/reference/transform');
    expect(source).toContain('/viz/plot/mark/path');

    const compiled = String(await compile(source, compileOptions));
    expect(compiled).toContain('ShowcaseGallery');
    expect(compiled).toContain('h2');
  });

  it.each(['zh', 'en'] as const)('Scatter %s 默认展示分类编码，并保留三个互补的真实数据示例', lang => {
    const source = readFileSync(scatterContentPath(lang), 'utf8');

    expect(source).not.toContain("id: 'scatter-basic'");
    expect(source.indexOf("id: 'scatter-fertility-work'")).toBeLessThan(
      source.indexOf("id: 'scatter-penguins-facet-jitter'"),
    );
    expect(source.match(/id: 'scatter-fertility-work'/g)).toHaveLength(1);
    expect(source.match(/id: 'scatter-penguins-facet-jitter'/g)).toHaveLength(1);
    expect(source.match(/id: 'scatter-world-cup-shots'/g)).toHaveLength(1);
  });

  it.each(['scatter-penguins-facet-jitter', 'scatter-world-cup-shots'])(
    '%s 提供数据、双语 demo 与双语 controls',
    id => {
      for (const filename of [
        `${id}.data.ts`,
        `${id}.controls.ts`,
        `${id}.en.controls.ts`,
        `${id}.zh.demo.tsx`,
        `${id}.en.demo.tsx`,
      ]) {
        expect(existsSync(scatterExamplePath(filename)), filename).toBe(true);
      }
    },
  );

  it('Scatter 生育率与女性劳动参与率示例提供完整的双语 preview 文件', () => {
    for (const filename of [
      'scatter-fertility-work.data.ts',
      'scatter-fertility-work.controls.ts',
      'scatter-fertility-work.en.controls.ts',
      'scatter-fertility-work.zh.demo.tsx',
      'scatter-fertility-work.en.demo.tsx',
    ]) {
      expect(existsSync(scatterExamplePath(filename)), filename).toBe(true);
    }
  });

  it('Bubble 基础示例提供数据、双语 demo 与双语 controls', () => {
    for (const filename of [
      'bubble-basic.data.ts',
      'bubble-basic.controls.ts',
      'bubble-basic.en.controls.ts',
      'bubble-basic.zh.demo.tsx',
      'bubble-basic.en.demo.tsx',
    ]) {
      expect(existsSync(bubbleExamplePath(filename)), filename).toBe(true);
    }
  });

  it('Regression 基础示例提供数据、双语 demo 与双语 controls', () => {
    for (const filename of [
      'regression-basic.data.ts',
      'regression-basic.controls.ts',
      'regression-basic.en.controls.ts',
      'regression-basic.zh.demo.tsx',
      'regression-basic.en.demo.tsx',
    ]) {
      expect(existsSync(regressionExamplePath(filename)), filename).toBe(true);
    }
  });

  it.each(['zh', 'en'] as const)('%s 图形模型分组覆盖四个共享主题且保持 MDX 可编译', async lang => {
    const sources = {
      index: readFileSync(chartModelContentPath('index', lang), 'utf8'),
      structure: readFileSync(chartModelContentPath('structure', lang), 'utf8'),
      authoring: readFileSync(chartModelContentPath('authoring', lang), 'utf8'),
      presentation: readFileSync(chartModelContentPath('presentation', lang), 'utf8'),
      plot: readFileSync(chartModelContentPath('plot', lang), 'utf8'),
    };

    expect(sources.index).toContain('chart-model-pipeline');
    expect(sources.structure).toContain('`ScatterChartSchema`');
    expect(sources.structure).toContain('`@retikz/chart/point/scatter`');
    expect(sources.structure).not.toContain('`ChartRuntimeOptions.familyDefinitions`');
    expect(sources.authoring).toContain('`normalizeXxxChart`');
    expect(sources.presentation).toContain('`ChartTitle`');
    expect(sources.plot).toContain('`themeDefinitions`');
    expect(sources.plot).toContain('`plotThemeStyles`');
    expect(Object.values(sources).join('\n')).not.toMatch(/IRChartShared|createChartComposites/);

    for (const source of Object.values(sources)) {
      await expect(compile(source, compileOptions)).resolves.toBeTruthy();
    }
  });

  it.each([
    ['zh', /负数.+报错/u],
    ['en', /negative.+error/iu],
  ] as const)('%s 点图文档覆盖负数错误与 descriptor 来源', (lang, negativePattern) => {
    const point = readFileSync(pointContentPath(lang), 'utf8');

    expect(point).toMatch(negativePattern);
    expect(point).toContain("path: 'packages/viz/plot/src/providers/channel/features/node.ts'");
  });
});
