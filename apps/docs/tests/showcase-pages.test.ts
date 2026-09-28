import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { CompileOptions } from '@mdx-js/mdx';
import { compile } from '@mdx-js/mdx';
import rehypeMdxCodeProps from 'rehype-mdx-code-props';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import { describe, expect, it } from 'vitest';

import { collectShowcasePages } from '@/modules/docs/components/showcase';
import { bubbleMinimalData } from '@/modules/docs/contents/viz/chart/points/bubble/bubble-minimal.data';
import { connectedScatterMinimalData } from '@/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-minimal.data';
import { rangedDotMinimalData } from '@/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-minimal.data';
import { regressionMinimalData } from '@/modules/docs/contents/viz/chart/points/regression/regression-minimal.data';
import { scatterMinimalData } from '@/modules/docs/contents/viz/chart/points/scatter/scatter-minimal.data';
import { stripPalmerPenguinsData } from '@/modules/docs/contents/viz/chart/points/strip/strip-palmer-penguins.data';
import type { Section } from '@/modules/docs/data';
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
const pointChartContentPath = (chart: string, lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/${chart}/index.${lang}.mdx`);
const pointChartExamplePath = (chart: string, filename: string) =>
  resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/${chart}/${filename}`);
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
  resolve(process.cwd(), `src/modules/docs/contents/kernel/components/design/composite/index.${lang}.mdx`);

const compileOptions: CompileOptions = {
  outputFormat: 'function-body',
  development: false,
  remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm, remarkMath],
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

    expect(compiled).toContain('composite-pipeline');
    expect(compiled).toContain('/kernel/components/composite');
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

  it('普通散点文档不进入 Showcase 页面集合', () => {
    expect(collectShowcasePages('viz', vizSection).map(page => page.path)).not.toContain('/viz/chart/points/scatter');
  });

  it('Bubble 使用普通组件文档布局', () => {
    expect(collectShowcasePages('viz', vizSection).map(page => page.path)).not.toContain('/viz/chart/points/bubble');
  });

  it('Regression 使用普通组件文档布局', () => {
    expect(collectShowcasePages('viz', vizSection).map(page => page.path)).not.toContain(
      '/viz/chart/points/regression',
    );
  });

  it('Strip 使用普通组件文档布局', () => {
    expect(collectShowcasePages('viz', vizSection).map(page => page.path)).not.toContain('/viz/chart/points/strip');
  });

  it('将 Scatter 页面说明为 Chart-native authoring，并保留独立的 Plot 扩展边界', () => {
    const chartSection = vizSection.find(section => section.id === 'chart');
    const pointsPage = chartSection?.pages.find(page => page.id === 'points');
    const scatterPage = pointsPage?.children?.find(page => page.id === 'scatter');

    expect(scatterPage?.meta).toMatchObject({
      pageType: 'component',
      capability: 'chart.scatter',
      sourceOfTruth: 'docs',
      layout: 'article',
    });

    const zh = readFileSync(scatterContentPath('zh'), 'utf8');
    const en = readFileSync(scatterContentPath('en'), 'utf8');
    expect(zh).toContain("from '@retikz/chart-react/point'");
    expect(en).toContain("from '@retikz/chart-react/point'");
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
    expect(compiled).not.toContain('ShowcaseGallery');
    expect(compiled).toContain('ComponentPreview');
    expect(compiled).toContain('DocTabs');
    expect(compiled).toContain('h2');
  });

  it.each(['zh', 'en'] as const)('Bubble %s 保留必需尺寸字段语义并保持 MDX 可编译', async lang => {
    const source = readFileSync(bubbleContentPath(lang), 'utf8');
    expect(source).toContain('`BubbleChart`');
    expect(source).toContain('`BubbleEncodings.size`');
    expect(source).toContain('/viz/chart/points/scatter');

    const compiled = String(await compile(source, compileOptions));
    expect(compiled).not.toContain('ShowcaseGallery');
    expect(compiled).toContain('ComponentPreview');
    expect(compiled).toContain('DocTabs');
    expect(compiled).toContain('h2');
  });

  it.each(['zh', 'en'] as const)('Regression %s 覆盖精确 API、失败边界与 Plot escape hatch', async lang => {
    const source = readRequiredFile(regressionContentPath(lang));

    for (const publicName of [
      '@retikz/chart/point',
      '@retikz/chart-react/point',
      '@retikz/chart-vanilla/point',
      '`RegressionChart`',
      '`RegressionEncodings`',
      '`RegressionProperties`',
      '`RegressionMark`',
      '`regressionChart`',
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
    expect(compiled).not.toContain('ShowcaseGallery');
    expect(compiled).toContain('ComponentPreview');
    expect(compiled).toContain('DocTabs');
    expect(compiled).toContain('h2');
  });

  it.each(['zh', 'en'] as const)('Scatter %s 提供类型示例，总纲承载公共原理图', lang => {
    const source = readFileSync(scatterContentPath(lang), 'utf8');
    const previews = [...source.matchAll(/<ComponentPreview[\s\S]*?\/>/g)].map(match => match[0]);
    expect(previews).toHaveLength(6);
    for (const [index, name] of [
      'scatter-minimal',
      'scatter-fertility-work',
      'scatter-appearance',
      'scatter-marks',
      'scatter-facet',
      'scatter-world-cup-shots',
    ].entries()) {
      expect(previews[index]).toContain(name);
    }
    const groupSource = readFileSync(
      resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/index.${lang}.mdx`),
      'utf8',
    );
    for (const name of ['point-padding-figure', 'point-auto-padding']) {
      expect(groupSource).toContain(`files="${name}"`);
      expect(existsSync(resolve(process.cwd(), `src/modules/docs/contents/viz/chart/points/${name}.tsx`))).toBe(true);
    }
    expect(previews[0]).not.toContain('controls=');
    expect(previews[0]).toContain('hideCode');
    const headings = [...source.matchAll(/^## (.+)$/gm)].map(match => match[1]);
    expect(headings).toEqual(
      lang === 'zh'
        ? ['接入方式', '基础用法', '扩展用法', '错误与限制', '实现原理', 'API 参考', 'Schema 参考', '延伸阅读']
        : [
            'Using this topic',
            'Basic usage',
            'Extended usage',
            'Errors and limitations',
            'Implementation',
            'API reference',
            'Schema reference',
            'Further reading',
          ],
    );
  });

  const minimalPointExamples = [
    {
      chart: 'scatter',
      id: 'scatter-minimal',
      nextId: 'scatter-fertility-work',
      root: 'ScatterChart',
      data: scatterMinimalData,
      rowCount: 100,
      fields: ['imdbRating', 'rottenTomatoesRating'],
    },
    {
      chart: 'bubble',
      id: 'bubble-minimal',
      nextId: 'bubble-basic',
      root: 'BubbleChart',
      data: bubbleMinimalData,
      rowCount: 100,
      fields: ['depthKm', 'magnitude', 'significance'],
    },
    {
      chart: 'regression',
      id: 'regression-minimal',
      nextId: 'regression-basic',
      root: 'RegressionChart',
      data: regressionMinimalData,
      rowCount: 100,
      fields: ['distanceMiles', 'delayMinutes'],
    },
    {
      chart: 'connected-scatter',
      id: 'connected-scatter-minimal',
      nextId: 'connected-scatter-basic',
      root: 'ConnectedScatterChart',
      data: connectedScatterMinimalData,
      rowCount: 100,
      fields: ['month', 'unemploymentRate'],
    },
    {
      chart: 'ranged-dot',
      id: 'ranged-dot-minimal',
      nextId: 'ranged-dot-basic',
      root: 'RangedDotChart',
      data: rangedDotMinimalData,
      rowCount: 20,
      fields: ['day', 'minimumTemperature', 'maximumTemperature'],
    },
    {
      chart: 'strip',
      id: 'strip-minimal',
      nextId: 'strip-basic',
      root: 'StripChart',
      data: stripPalmerPenguinsData,
      rowCount: 90,
      fields: ['species', 'flipperLengthMm'],
    },
  ] as const;

  it.each(minimalPointExamples)('$chart 接入示例保持指定数据量、root-only、无 presentation 且无 controls', example => {
    expect(example.data).toHaveLength(example.rowCount);
    expect(Object.keys(example.data[0] ?? {}).sort()).toEqual([...example.fields].sort());

    for (const lang of ['zh', 'en'] as const) {
      const demo = readRequiredFile(pointChartExamplePath(example.chart, `${example.id}.${lang}.demo.tsx`));
      expect(demo).toContain(`<${example.root}`);
      expect(demo).toContain('rows={');
      expect(demo).not.toContain('presentation={{');
      expect(demo).toContain('recipe={{');
      expect(demo).toContain('datasetImports');
      expect(demo).not.toContain('defineControlledPreview');
      expect(demo).not.toContain('previewControls');
      expect(demo).not.toContain('Encodings ');
      expect(demo).not.toContain('Properties ');
    }
  });

  it.each(minimalPointExamples.filter(example => example.chart !== 'scatter'))(
    '$chart 双语页以无 controls 的接入示例作为首例',
    async example => {
      for (const lang of ['zh', 'en'] as const) {
        const source = readFileSync(pointChartContentPath(example.chart, lang), 'utf8');
        await expect(compile(source, compileOptions)).resolves.toBeDefined();
        const previews = [...source.matchAll(/<ComponentPreview[\s\S]*?\/>/g)].map(match => match[0]);
        expect(previews[0]).toContain(example.id);
        expect(previews[0]).not.toContain('controls=');
        expect(previews[0]).toContain('hideCode');
        expect(previews.some(preview => preview.includes(example.nextId))).toBe(true);
        expect(source).toContain('value="react-jsx"');
        expect(source).toContain('value="react-ir"');
        expect(source).toContain('value="vanilla-api"');
        expect(source).toContain('value="vanilla-ir"');
      }
    },
  );

  it('空间 Scatter 提供数据、双语 demo 与双语 controls', () => {
    const id = 'scatter-world-cup-shots';
    for (const filename of [
      `${id}.data.ts`,
      `${id}.controls.ts`,
      `${id}.en.controls.ts`,
      `${id}.zh.demo.tsx`,
      `${id}.en.demo.tsx`,
    ]) {
      expect(existsSync(scatterExamplePath(filename)), filename).toBe(true);
    }
  });

  it('Strip 进阶示例提供数据、双语 demo 与双语 controls', () => {
    for (const filename of [
      'strip-vega-barley.data.ts',
      'strip-basic.controls.ts',
      'strip-basic.en.controls.ts',
      'strip-basic.zh.demo.tsx',
      'strip-basic.en.demo.tsx',
    ]) {
      expect(existsSync(pointChartExamplePath('strip', filename)), filename).toBe(true);
    }
  });

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

  it('Bubble 进阶示例提供数据、双语 demo 与双语 controls', () => {
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

  it('Regression 进阶示例提供数据、双语 demo 与双语 controls', () => {
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
    expect(sources.structure).toContain('`@retikz/chart/point`');
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
