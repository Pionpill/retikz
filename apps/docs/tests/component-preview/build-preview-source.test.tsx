import type { IRScene } from '@retikz/core';
import type { FC } from 'react';

import { ChartSource, ChartTitle, ScatterChart } from '@retikz/chart-react/point';
import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { Plot, PointMark } from '@retikz/plot-react';
import { Layout, Node } from '@retikz/react';
import { Axes, Frame, FrameDescription, FrameTitle, Grid } from '@retikz/standard-react';
import { DetailColumn, DetailTable, ManualTable } from '@retikz/table-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildPreviewSource } from '../../src/modules/docs/components/component-preview/source-panel';
import { buildPreviewIR, formatIR, irHasAnimations } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import PathInspectorDemo, {
  previewSource as pathInspectorPreviewSource,
} from '../../src/modules/docs/contents/kernel/components/draw/path/path-inspector.demo';
import FramePlaygroundDemo, {
  previewSource as framePlaygroundPreviewSource,
} from '../../src/modules/docs/contents/library/standard/composite/frame/frame-playground.demo';
import TableDetailDemo, {
  previewSource as tableDetailPreviewSource,
} from '../../src/modules/docs/contents/viz/table/detail/table-detail.zh.demo';
import TableLayoutPlaygroundDemo, {
  previewSource as tableLayoutPlaygroundPreviewSource,
} from '../../src/modules/docs/contents/viz/table/detail/table-layout-playground.zh.demo';

const StaticDemo: FC = () => (
  <Layout width={40} height={20}>
    <Node id="box" position={[0, 0]}>
      A
    </Node>
  </Layout>
);

const AlternateDemo: FC = () => (
  <Layout width={80} height={30}>
    <Node id="alternate" position={[10, 5]}>
      B
    </Node>
  </Layout>
);

const StandardCompositeDemo: FC = () => (
  <Layout width={100} height={80}>
    <Grid bounds={{ start: [10, 10], end: [90, 70] }} line={{ spacing: 20 }} />
    <Axes x={{ extent: 40 }} y={{ extent: 30 }} />
    <Frame id="group/frame" padding={{ x: 8, y: 10 }} gap={4} headerDirection="vertical">
      <FrameTitle>Group</FrameTitle>
      <FrameDescription>Preview source</FrameDescription>
      <Node position={[50, 40]}>A</Node>
    </Frame>
  </Layout>
);

const plotRows = [
  { category: 'A', value: 1 },
  { category: 'B', value: 2 },
];

const PlotDemo: FC = () => (
  <Plot data={plotRows} width={100} height={80}>
    <PointMark x="category" y="value" />
  </Plot>
);

const ChartDemo: FC = () => (
  <ScatterChart
    data={[
      { income: 1000, life: 61 },
      { income: 4000, life: 72 },
    ]}
    encoding={{ x: { field: 'income' }, y: { field: 'life' } }}
    width={320}
    height={200}
  >
    <ChartTitle>Income and life expectancy</ChartTitle>
    <ChartSource>World Bank</ChartSource>
  </ScatterChart>
);

const EmbeddedTableDetailDemo: FC = () => (
  <Layout width={160} height={100}>
    <DetailTable id="scores" dataRef="scores" data={plotRows}>
      <DetailColumn id="category" field="category" header="Category" />
      <DetailColumn id="value" field="value" header="Value" />
    </DetailTable>
  </Layout>
);

const ManualTableDemo: FC = () => (
  <Layout width={160} height={100}>
    <ManualTable
      id="manual-scores"
      rows={[
        [{ value: 'Category' }, { value: 'Value' }],
        [{ value: 'A' }, { value: 1 }],
      ]}
      rowKinds={['columnHeader', 'body']}
    />
  </Layout>
);

const staticIR = buildPreviewIR(StaticDemo).ir;
const alternateIR = buildPreviewIR(AlternateDemo).ir;
const PathInspectorCanonical: FC = () => pathInspectorPreviewSource.canonicalRender();

const createInput = (overrides: Record<string, unknown> = {}) => ({
  Component: StaticDemo,
  name: 'demo',
  key: '../../contents/test/demo.demo.tsx',
  segments: ['test'],
  rawSource: 'export default Demo;\n',
  sourceFiles: [],
  sourceContents: {},
  hideCode: false,
  ...overrides,
});

describe('buildPreviewSource', () => {
  it('让 Path Inspector 保持可见，同时不写入 canonical IR 与 Vanilla', () => {
    const preview = buildPreviewIR(PathInspectorCanonical);
    const vanilla = buildVanillaPreview(preview);
    const html = renderToStaticMarkup(<PathInspectorDemo />);

    expect(preview).not.toHaveProperty('inspectionRoots');
    expect(vanilla.code).not.toMatch(/\binspect\b/);
    expect(vanilla.svg).not.toContain('data-retikz-readonly-layer');
    expect(html).toContain('data-retikz-readonly-layer');
    expect(html).toContain('C1.1');
  });

  it('默认从静态 demo 派生 React、IR 与 Vanilla 源码', () => {
    const result = buildPreviewSource(createInput());

    expect(result.previewIr?.ir).toEqual(staticIR);
    expect(result.source?.react?.files[0]?.code).toBe('export default Demo;');
    expect(result.source?.ir?.files[0]?.code).toBe(formatIR(staticIR));
    expect(result.source?.vanilla?.files[0]?.code).toContain("from '@retikz/vanilla'");
    expect(result.source?.vanilla?.render).toBeTypeOf('function');
    expect(renderToStaticMarkup(result.source?.vanilla?.render?.('svg'))).toContain('<svg');
  });

  it('为 Standard composite 自动生成 helper、Adapter 与真实 Vanilla SVG', () => {
    const result = buildPreviewSource(createInput({ Component: StandardCompositeDemo }));

    expect(result.source?.vanilla?.files[0]?.code).toContain("from '@retikz/standard-vanilla'");
    expect(result.source?.vanilla?.files[0]?.code).toContain("grid('preview-grid-1'");
    expect(result.source?.vanilla?.files[0]?.code).toContain("axes('preview-axes-1'");
    expect(result.source?.vanilla?.files[0]?.code).toContain("frame('preview-frame-1'");
    expect(result.source?.vanilla?.files[0]?.code).toContain("title: { text: 'Group' }");
    expect(result.source?.vanilla?.files[0]?.code).toContain("description: { text: 'Preview source' }");
    expect(result.source?.vanilla?.files[0]?.code).toContain('padding: { x: 8, y: 10 }');
    expect(result.source?.vanilla?.files[0]?.code).toContain("headerDirection: 'vertical'");
    expect(result.source?.vanilla?.files[0]?.code).toContain('GridVanillaAdapter');
    expect(result.source?.vanilla?.files[0]?.code).toContain('AxesVanillaAdapter');
    expect(result.source?.vanilla?.files[0]?.code).toContain('FrameVanillaAdapter');
    expect(renderToStaticMarkup(result.source?.vanilla?.render?.('svg'))).toContain('<svg');
  });

  it('从 Frame controls canonical 状态生成包含 header 的 Vanilla 视图', () => {
    const result = buildPreviewSource(
      createInput({
        Component: FramePlaygroundDemo,
        previewSource: framePlaygroundPreviewSource,
      }),
    );
    const vanilla = result.source?.vanilla;

    expect(vanilla?.files[0]?.code).toContain("from '@retikz/standard-vanilla'");
    expect(vanilla?.files[0]?.code).toContain("text: 'FrameTitle'");
    expect(vanilla?.files[0]?.code).toContain("text: 'FrameDescription'");
    expect(vanilla?.files[0]?.code).not.toContain('Failed to generate vanilla code');
    expect(vanilla?.render).toBeTypeOf('function');
    expect(renderToStaticMarkup(vanilla?.render?.('svg'))).toContain('<svg');
  });

  it('为 Plot composite 自动生成 renderPlot、dataset 与真实 Vanilla SVG', () => {
    const result = buildPreviewSource(createInput({ Component: PlotDemo }));

    expect(result.source?.vanilla?.files[0]?.code).toContain("import { renderPlot } from '@retikz/plot-vanilla'");
    expect(result.source?.vanilla?.files[0]?.code).toContain("category: 'A'");
    expect(renderToStaticMarkup(result.source?.vanilla?.render?.('svg'))).toContain('<svg');
  });

  it('为 Chart composite 自动生成 canonical authoring、dataset 与真实 Vanilla SVG', () => {
    const result = buildPreviewSource(createInput({ Component: ChartDemo }));
    const vanilla = result.source?.vanilla;

    expect(vanilla?.files[0]?.code).toContain("import { createChart, renderChart } from '@retikz/chart-vanilla'");
    expect(vanilla?.files[0]?.code).toContain("preset: 'title'");
    expect(vanilla?.files[0]?.code).toContain("preset: 'source'");
    expect(vanilla?.files[0]?.code).toContain('income: 1000');
    expect(vanilla?.render).toBeTypeOf('function');
    expect(renderToStaticMarkup(vanilla?.render?.('svg'))).toContain('<svg');
  });

  it('为 Detail Table 自动生成 Table adapter、dataset 与真实 Vanilla SVG', () => {
    const preview = buildPreviewIR(EmbeddedTableDetailDemo);
    const result = buildPreviewSource(createInput({ Component: EmbeddedTableDetailDemo }));
    const vanilla = result.source?.vanilla;

    expect(vanilla?.files[0]?.code).toContain("from '@retikz/table-vanilla'");
    expect(vanilla?.files[0]?.code).toContain("embedTable('preview-table-1'");
    expect(vanilla?.files[0]?.code).toContain('createTableAdapter()');
    expect(vanilla?.files[0]?.code).toContain("category: 'A'");
    expect(vanilla?.render).toBeUndefined();
    expect(buildVanillaPreview(preview).svg).toContain('<svg');
  });

  it('为 Manual Table 自动生成不带 dataset 的 Table adapter 与真实 Vanilla SVG', () => {
    const preview = buildPreviewIR(ManualTableDemo);
    const result = buildPreviewSource(createInput({ Component: ManualTableDemo }));
    const vanilla = result.source?.vanilla;

    expect(vanilla?.files[0]?.code).toContain("from '@retikz/table-vanilla'");
    expect(vanilla?.files[0]?.code).toContain("embedTable('preview-table-1'");
    expect(vanilla?.files[0]?.code).toContain('createTableAdapter()');
    expect(vanilla?.files[0]?.code).not.toContain('const datasets =');
    expect(vanilla?.render).toBeUndefined();
    expect(buildVanillaPreview(preview).svg).toContain('<svg');
  });

  it('Detail Table dataset 未被捕获时生成明确诊断', () => {
    const tableIR = buildPreviewIR(EmbeddedTableDetailDemo).ir;
    const result = buildPreviewSource(createInput({ exportedPreviewIR: tableIR }));

    expect(result.source?.vanilla?.files[0]?.code).toContain(
      '// Cannot generate Vanilla preview: Table dataset "scores" was not captured.',
    );
    expect(result.source?.vanilla?.render).toBeUndefined();
  });

  it('自定义 Table structure 生成需要 runtime definitions 的明确诊断', () => {
    const tableIR = {
      type: 'scene',
      version: 1,
      children: [
        {
          namespace: 'table',
          type: 'table',
          id: 'custom-table',
          structure: { kind: 'heatmap', field: 'value' },
        },
      ],
    } as IRScene;
    const result = buildPreviewSource(createInput({ exportedPreviewIR: tableIR }));

    expect(result.source?.vanilla?.files[0]?.code).toContain(
      '// Cannot generate Vanilla preview: Table structure "heatmap" requires runtime definitions that cannot be serialized.',
    );
    expect(result.source?.vanilla?.render).toBeUndefined();
  });

  it('Table 明细页 demo 通过 canonical render 派生三种源码视图', () => {
    const result = buildPreviewSource(
      createInput({
        Component: TableDetailDemo,
        previewSource: tableDetailPreviewSource,
        name: 'table-detail',
        key: '../../contents/viz/table/detail/table-detail.zh.demo.tsx',
        segments: ['viz', 'table', 'detail'],
        sourceFiles: [{ file: 'table-detail.data.ts' }],
      }),
    );
    const vanilla = result.source?.vanilla;

    expect(result.previewIr).not.toBeNull();
    expect(result.source?.react).toBeDefined();
    expect(result.source?.ir).toBeDefined();
    expect(vanilla?.files[0]?.code).toContain("import { scoreRows } from './table-detail.data'");
    expect(vanilla?.files[0]?.code).not.toContain('const datasets =');
    expect(vanilla?.files.map(file => file.filename)).toContain('table-detail.data.ts');
    expect(vanilla?.render).toBeUndefined();
  });

  it('Table 布局 playground 从 canonical 状态派生三种源码视图', () => {
    const result = buildPreviewSource(
      createInput({
        Component: TableLayoutPlaygroundDemo,
        previewSource: tableLayoutPlaygroundPreviewSource,
        name: 'table-layout-playground',
        key: '../../contents/viz/table/detail/table-layout-playground.zh.demo.tsx',
        segments: ['viz', 'table', 'detail'],
        sourceFiles: [{ file: 'table-layout-playground.zh.data.ts' }],
      }),
    );
    const vanilla = result.source?.vanilla;

    expect(result.previewIr).not.toBeNull();
    expect(result.source?.react).toBeDefined();
    expect(result.source?.ir).toBeDefined();
    expect(vanilla?.files[0]?.code).toContain(
      "import { tableLayoutPlaygroundRows } from './table-layout-playground.zh.data'",
    );
    expect(vanilla?.files[0]?.code).not.toContain('const datasets =');
    expect(vanilla?.files.map(file => file.filename)).toContain('table-layout-playground.zh.data.ts');
    expect(vanilla?.render).toBeUndefined();
  });

  it('deriveIR false 时不执行 demo 并保持 React-only', () => {
    let executions = 0;
    const ThrowingDemo: FC = () => {
      executions++;
      throw new Error('must not execute');
    };

    const result = buildPreviewSource(createInput({ Component: ThrowingDemo, previewSource: { deriveIR: false } }));

    expect(executions).toBe(0);
    expect(result.previewIr).toBeNull();
    expect(result.source?.react).toBeDefined();
    expect(result.source?.ir).toBeUndefined();
    expect(result.source?.vanilla).toBeUndefined();
  });

  it('hideCode 时不执行 demo 也不构造源码', () => {
    let executions = 0;
    const ThrowingDemo: FC = () => {
      executions++;
      throw new Error('must not execute');
    };

    const result = buildPreviewSource(createInput({ Component: ThrowingDemo, hideCode: true }));

    expect(executions).toBe(0);
    expect(result).toEqual({ source: undefined, previewIr: null });
  });

  it('irJsonOverride 优先于模块导出和自动派生', () => {
    let executions = 0;
    const ThrowingDemo: FC = () => {
      executions++;
      throw new Error('must not execute');
    };
    const irJsonOverride = formatIR(alternateIR);

    const result = buildPreviewSource(
      createInput({ Component: ThrowingDemo, irJsonOverride, exportedPreviewIR: staticIR }),
    );

    expect(executions).toBe(0);
    expect(result.previewIr?.ir).toEqual(alternateIR);
    expect(result.source?.ir?.files[0]?.code).toBe(irJsonOverride);
  });

  it('previewIR 优先于自动派生', () => {
    let executions = 0;
    const ThrowingDemo: FC = () => {
      executions++;
      throw new Error('must not execute');
    };

    const result = buildPreviewSource(createInput({ Component: ThrowingDemo, exportedPreviewIR: alternateIR }));

    expect(executions).toBe(0);
    expect(result.previewIr?.ir).toEqual(alternateIR);
  });

  it('deriveIR false 时仍从 previewIR 生成 IR 与 Vanilla', () => {
    const result = buildPreviewSource(createInput({ previewSource: { deriveIR: false }, exportedPreviewIR: staticIR }));

    expect(result.previewIr?.ir).toEqual(staticIR);
    expect(result.source?.ir).toBeDefined();
    expect(result.source?.vanilla?.files[0]?.code).toContain("from '@retikz/vanilla'");
  });

  it('deriveIR false 时可从 canonicalRender 生成默认状态的 IR 与 Vanilla', () => {
    let executions = 0;
    const ThrowingDemo: FC = () => {
      executions++;
      throw new Error('must not execute');
    };

    const result = buildPreviewSource(
      createInput({
        Component: ThrowingDemo,
        previewSource: { deriveIR: false, canonicalRender: () => <StaticDemo /> },
      }),
    );

    expect(executions).toBe(0);
    expect(result.previewIr?.ir).toEqual(staticIR);
    expect(result.source?.ir).toBeDefined();
    expect(result.source?.vanilla?.files[0]?.code).toContain("from '@retikz/vanilla'");
  });

  it('自动派生失败时保留 React 和 IR 诊断但不生成 Vanilla', () => {
    const ThrowingDemo: FC = () => {
      throw new Error('derive failed');
    };

    const result = buildPreviewSource(createInput({ Component: ThrowingDemo }));

    expect(result.previewIr).toBeNull();
    expect(result.source?.react).toBeDefined();
    expect(result.source?.ir?.files[0]?.code).toContain('// Failed to compute IR: derive failed');
    expect(result.source?.vanilla).toBeUndefined();
  });

  it('vanillaOverride 优先于 IR codegen', () => {
    const result = buildPreviewSource(createInput({ vanillaOverride: 'export const figure = custom();\n' }));

    expect(result.source?.vanilla?.files[0]?.code).toBe('export const figure = custom();');
  });

  it('未知 composite 生成明确 Vanilla 诊断但不伪造运行结果', () => {
    const compositeIR = {
      type: 'scene',
      version: 1,
      children: [{ namespace: 'plot', type: 'demo' }],
    } as IRScene;
    const result = buildPreviewSource(createInput({ exportedPreviewIR: compositeIR }));

    expect(result.previewIr?.ir).toEqual(compositeIR);
    expect(result.source?.ir).toBeDefined();
    expect(result.source?.vanilla?.files[0]?.code).toContain(
      '// Cannot generate Vanilla preview for Tier 2 composite "plot.demo".',
    );
    expect(result.source?.vanilla?.render).toBeUndefined();
  });

  it('结构非法但可解析的 IR 只保留源码诊断并阻断宿主消费', () => {
    const malformedIR = {} as IRScene;
    const result = buildPreviewSource(createInput({ exportedPreviewIR: malformedIR }));

    expect(result.source?.react).toBeDefined();
    expect(result.source?.ir?.files[0]?.code).toBe(formatIR(malformedIR));
    expect(result.source?.vanilla?.files[0]?.code).toContain('// Failed to generate vanilla code:');
    expect(result.previewIr).toBeNull();
    expect(() => result.previewIr !== null && irHasAnimations(result.previewIr.ir)).not.toThrow();
  });

  it('嵌套子项非法的显式 IR 不进入 renderer 与宿主消费', () => {
    const malformedIR = {
      type: 'scene',
      version: 1,
      children: [null],
    } as unknown as IRScene;
    const result = buildPreviewSource(createInput({ exportedPreviewIR: malformedIR }));

    expect(result.source?.ir?.files[0]?.code).toBe(formatIR(malformedIR));
    expect(result.source?.ir?.render).toBeUndefined();
    expect(result.source?.vanilla?.files[0]?.code).toContain('// Failed to generate vanilla code:');
    expect(result.previewIr).toBeNull();
  });

  it('automatic Vanilla preview consumes the ambient Theme selector', () => {
    const firstTheme = { mode: ThemeMode.Light };
    const secondTheme = { mode: ThemeMode.Dark };
    const firstColor = resolveDefaultCoreThemeColors(firstTheme.mode).categorical[0];
    const secondColor = resolveDefaultCoreThemeColors(secondTheme.mode).categorical[0];
    const first = buildPreviewSource(
      createInput({
        Component: PlotDemo,
        theme: firstTheme,
      }),
    );
    const second = buildPreviewSource(
      createInput({
        Component: PlotDemo,
        theme: secondTheme,
      }),
    );

    const firstMarkup = renderToStaticMarkup(first.source?.vanilla?.render?.('svg'));
    const secondMarkup = renderToStaticMarkup(second.source?.vanilla?.render?.('svg'));

    expect(firstMarkup).toContain(firstColor);
    expect(secondMarkup).toContain(secondColor);
    expect(firstMarkup).not.toBe(secondMarkup);
  });

  it('explicit vanillaSvg remains unchanged when the ambient Theme changes', () => {
    const vanillaSvg = '<svg data-static="true"><path fill="#123456" /></svg>';
    const first = buildPreviewSource(
      createInput({
        vanillaSvg,
        theme: { tokens: { core: { 'palette.categorical': ['#101010'] } } },
      }),
    );
    const second = buildPreviewSource(
      createInput({
        vanillaSvg,
        theme: { style: 'vibrant', tokens: { core: { 'palette.categorical': ['#303030'] } } },
      }),
    );

    expect(renderToStaticMarkup(first.source?.vanilla?.render?.('svg'))).toBe(
      renderToStaticMarkup(second.source?.vanilla?.render?.('svg')),
    );
  });
});
