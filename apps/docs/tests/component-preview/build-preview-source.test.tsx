import type { IRScene } from '@retikz/core';
import type { FC } from 'react';

import { Plot, PointMark } from '@retikz/plot-react';
import { Layout, Node } from '@retikz/react';
import { Axes, Frame, Grid } from '@retikz/standard-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildPreviewSource } from '../../src/modules/docs/components/component-preview/source-panel';
import { buildPreviewIR, formatIR, irHasAnimations } from '../../src/modules/docs/components/component-preview/utils';

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
    <Grid bounds={{ min: [10, 10], max: [90, 70] }} spacing={20} />
    <Axes extent={{ x: 40, y: 30 }} />
    <Frame id="group" gap={4}>
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

const staticIR = buildPreviewIR(StaticDemo).ir;
const alternateIR = buildPreviewIR(AlternateDemo).ir;

const createInput = (overrides: Record<string, unknown> = {}) => ({
  Component: StaticDemo,
  name: 'demo',
  key: '../../contents/test/demo.demo.tsx',
  segments: ['test'],
  rawSource: 'export default Demo;\n',
  sourceFiles: [],
  hideCode: false,
  ...overrides,
});

describe('buildPreviewSource', () => {
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
    expect(result.source?.vanilla?.files[0]?.code).toContain('GridVanillaAdapter');
    expect(result.source?.vanilla?.files[0]?.code).toContain('AxesVanillaAdapter');
    expect(result.source?.vanilla?.files[0]?.code).toContain('FrameVanillaAdapter');
    expect(renderToStaticMarkup(result.source?.vanilla?.render?.('svg'))).toContain('<svg');
  });

  it('为 Plot composite 自动生成 renderPlot、dataset 与真实 Vanilla SVG', () => {
    const result = buildPreviewSource(createInput({ Component: PlotDemo }));

    expect(result.source?.vanilla?.files[0]?.code).toContain("import { renderPlot } from '@retikz/plot-vanilla'");
    expect(result.source?.vanilla?.files[0]?.code).toContain("category: 'A'");
    expect(renderToStaticMarkup(result.source?.vanilla?.render?.('svg'))).toContain('<svg');
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
});
