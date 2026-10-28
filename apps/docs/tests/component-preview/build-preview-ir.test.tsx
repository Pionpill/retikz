import { ChartData, ChartLayout } from '@retikz/chart-react';
import { BubbleChart, BubbleEncodings, ScatterChart, ScatterEncodings } from '@retikz/chart-react/point';
import type { CoreProviderContribution } from '@retikz/core';
import { Entity, Graph } from '@retikz/graph-react';
import { Plot, PointMark } from '@retikz/plot-react';
import { Draw, Layout, Node } from '@retikz/react';
import type { LayoutProps } from '@retikz/react';
import { Circle, Ellipse, Rectangle, Polygon, Star, Arc, Sector } from '@retikz/standard-react/shape';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';
import { useMemo } from 'react';
import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import {
  buildPreviewIR,
  buildPreviewSourceIR,
  collectPreviewChartSources,
} from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import DataTransformDemo from '../../src/modules/docs/contents/viz/data/transform/data-transform-shape.zh.demo';
import { createGraphPreviewSource } from '../../src/modules/docs/preview';

const hookedDatasets = { sample: [{ value: 1 }] };

it('保留数据转换源 IR 语义，无需内联视觉样式', () => {
  const preview = buildPreviewIR(DataTransformDemo);
  const source = JSON.stringify(preview.sourceIr);
  expect(source).not.toContain('"stroke"');
  expect(source).not.toContain('"font"');
  expect(source).not.toContain('"headerLayout"');
  expect(source).not.toContain('"bodyLayout"');
  expect(source).not.toContain('"defaultCellLayout"');
  expect(preview.sourceIr.theme).toEqual({ name: 'docs.logic' });
  expect(source).toContain('docs.logic.operation');
  expect(source).toContain('summarize');
});

it('在源和运行时预览 IR 中保留 Layout 主题选择器', () => {
  const Demo: FC = () => (
    <Layout theme={{ name: 'docs.logic', mode: 'dark' }}>
      <Node>Theme</Node>
    </Layout>
  );
  const preview = buildPreviewIR(Demo);
  expect(preview.sourceIr.theme).toEqual({ name: 'docs.logic', mode: 'dark' });
  expect(preview.ir.theme).toEqual(preview.sourceIr.theme);
});

const hookedProviderKey = { capability: 'composite' as const, namespace: 'hooked', type: 'demo' };

const hookedCompositeDependencies = {
  roots: [hookedProviderKey],
  providers: [
    {
      key: hookedProviderKey,
      params: hookedDatasets,
      makeDefinition: () => {
        throw new Error('Preview IR collection must not materialize providers');
      },
    },
  ],
} satisfies CoreProviderContribution;

const hookedEmbeddableAdapter: InputEmbedAdapter = {
  kind: 'hooked.demo',
  lower: () => ({
    node: { namespace: 'hooked', type: 'demo' },
    providerDependencies: hookedCompositeDependencies,
  }),
};

const HookedEmbeddable: FC & {
  isTier2Embeddable?: true;
  inputEmbedAdapter?: InputEmbedAdapter;
} = () => {
  useMemo(() => 1, []);
  return <Layout width={40} height={20} />;
};

HookedEmbeddable.displayName = 'HookedEmbeddable';
HookedEmbeddable.isTier2Embeddable = true;
HookedEmbeddable.inputEmbedAdapter = hookedEmbeddableAdapter;

const HookedEmbeddableDemo: FC = () => <HookedEmbeddable />;

const GraphInputDemo: FC = () => (
  <Layout width={100} height={50} viewBox={{ x: 0, y: 0, width: 100, height: 50 }}>
    <Graph>
      <Entity id="service" role="participant" position={[50, 25]} />
    </Graph>
  </Layout>
);

const GraphStandalonePreviewSource = createGraphPreviewSource(() => (
  <Graph width={100} height={50} viewBox={{ x: 0, y: 0, width: 100, height: 50 }}>
    <Entity id="service" role="participant" position={[50, 25]} />
  </Graph>
));

const PlotStandaloneDemo: FC = () => (
  <Plot data={[{ category: 'A', value: 1 }]} width={240} height={120} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark encodings={{ position: { x: { field: 'category' }, y: { field: 'value' } } }} />
  </Plot>
);

const ChartStandaloneDemo: FC = () => (
  <ScatterChart>
    <ChartData data={[{ x: 1, y: 2 }]} />
    <ChartLayout width={640} height={360} layout={{ width: 320, height: 180 }} />
    <ScatterEncodings x="x" y="y" />
  </ScatterChart>
);

const BubbleStandaloneDemo: FC = () => (
  <BubbleChart>
    <ChartData data={[{ x: 1, y: 2, population: 3 }]} />
    <ChartLayout width={640} height={360} />
    <BubbleEncodings x="x" y="y" size="population" />
  </BubbleChart>
);

describe('buildPreviewIR', () => {
  it('使用同系列辅助函数通过 IR 和 Vanilla 预览渲染 Standard 形状语义', () => {
    const preview = buildPreviewIR(() => (
      <Layout>
        <Circle center={[0, 0]} radius={10} />
        <Ellipse center={[40, 0]} radius={{ x: 20, y: 10 }} />
        <Rectangle center={[80, 0]} side={20} />
        <Polygon center={[120, 0]} sides={5} radius={10} />
        <Star center={[160, 0]} outerRadius={10} points={5} />
        <Arc center={[200, 0]} radius={10} startAngle={0} endAngle={90} />
        <Sector center={[240, 0]} radius={10} innerRadius={5} startAngle={0} endAngle={90} />
      </Layout>
    ));

    expect(preview.sourceIr.children).toHaveLength(7);
    expect(preview.sourceIr.children[0]).toMatchObject({ namespace: 'standard', type: 'circle' });

    const vanilla = buildVanillaPreview(preview);

    for (const kind of ['circle', 'ellipse', 'rectangle', 'polygon', 'star', 'arc', 'sector'])
      expect(vanilla.code).toContain(`shape.${kind}(`);

    expect(vanilla.code).toContain("from '@retikz/standard-vanilla/shape'");
    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.svg).toContain('<path');
  });

  it('在 Source IR 和 Vanilla 输出中保留 rootScope 样式及默认值', () => {
    const preview = buildPreviewIR(() => (
      <Layout
        rootScope={{ defaults: { style: { stroke: '#123456', strokeWidth: 3 }, node: { layout: { padding: 12 } } } }}
      >
        <Node id="A" position={[0, 0]}>
          a
        </Node>
        <Node id="B" position={[100, 0]}>
          b
        </Node>
        <Draw way={['A', 'B']} />
      </Layout>
    ));

    for (const scene of [preview.sourceIr, preview.ir]) {
      expect(scene.children).toHaveLength(1);
      expect(scene.children[0]).toMatchObject({
        type: 'scope',

        defaults: { style: { stroke: '#123456', strokeWidth: 3 }, node: { layout: { padding: 12 } } },
        children: [{ type: 'node', id: 'A' }, { type: 'node', id: 'B' }, { type: 'path' }],
      });
    }

    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).toContain('scope(');
    expect(vanilla.code).toContain('#123456');
    expect(vanilla.code).toContain('padding: 12');
    expect(vanilla.svg).toContain('stroke="#123456"');
  });

  it.each<LayoutProps['rootScope']>([undefined, {}, { defaults: { style: {} } }, { defaults: { reset: false } }])(
    '不为无效的 rootScope %j 或宿主 props 添加 Scope',
    rootScope => {
      const preview = buildPreviewIR(() => (
        <Layout rootScope={rootScope} style={{ opacity: 0.5 }} runtime={{ mode: 'static' }}>
          <Node id="A" position={[0, 0]} />
        </Layout>
      ));

      expect(preview.sourceIr.children).toHaveLength(1);
      expect(preview.sourceIr.children[0]).toMatchObject({ type: 'node', id: 'A' });
    },
  );

  it('当提供 rootScope 时，保持完整的 IR 不变', () => {
    const ir = { type: 'scene' as const, version: 1 as const, children: [] };
    const preview = buildPreviewIR(() => <Layout ir={ir} rootScope={{ defaults: { style: { stroke: 'red' } } }} />);

    expect(preview.sourceIr).toBe(ir);
    expect(preview.ir).toBe(ir);
  });

  it('不执行使用 Hook 的可嵌入根组件', () => {
    const preview = buildPreviewIR(HookedEmbeddableDemo);

    expect(preview.ir.children).toEqual([{ namespace: 'hooked', type: 'demo' }]);
    expect(preview.contributions).toEqual([hookedCompositeDependencies]);
  });

  it('保留归一化的 Scene IR，而无需 Graph 特定的输入投影', () => {
    const preview = buildPreviewIR(GraphInputDemo);

    expect(preview.ir).toMatchObject({
      type: 'scene',
      version: 1,
      children: [
        {
          namespace: 'graph',
          type: 'graph',
          children: [{ namespace: 'graph', type: 'entity', id: 'service', role: 'participant' }],
        },
      ],
    });
    expect(preview).not.toHaveProperty('inputIR');
  });

  it('在派生规范预览 IR 时提升独立 Graph 宿主 props', () => {
    const canonical = GraphStandalonePreviewSource.canonicalRender?.() ?? null;

    expect(isValidElement(canonical) ? canonical.type : null).toBe(Layout);

    const preview = buildPreviewIR(() => canonical);

    expect(preview).toMatchObject({
      width: 100,
      height: 50,
      ir: {
        viewBox: { x: 0, y: 0, width: 100, height: 50 },
        children: [{ namespace: 'graph', type: 'graph', children: [{ id: 'service' }] }],
      },
    });
  });

  it('在导出嵌入预览内容之前删除独立的 Plot 宿主 props', () => {
    const preview = buildPreviewIR(PlotStandaloneDemo);

    expect(preview).toMatchObject({ width: 240, height: 120 });
    expect(preview.ir.children[0]).toMatchObject({ namespace: 'plot', type: 'plot', width: 240, height: 120 });
  });

  it('从 ChartLayout 读取独立尺寸，同时保留显式的 Source 布局', () => {
    const preview = buildPreviewIR(ChartStandaloneDemo);

    expect(preview).toMatchObject({ width: 640, height: 360 });
    expect(preview.sourceIr.children[0]).toMatchObject({
      namespace: 'chart',
      type: 'point',
      layout: { width: 320, height: 180 },
    });
  });

  it('从 React 编写树中收集确切的 Bubble Source', () => {
    expect(collectPreviewChartSources(BubbleStandaloneDemo({}))).toMatchObject([
      {
        namespace: 'chart',
        type: 'point',
        layout: { width: 640, height: 360 },
        recipe: {
          chartType: 'bubble',
          encodings: { x: 'x', y: 'y', size: 'population' },
        },
      },
    ]);
  });

  it('根据编写输入而不是运行时默认值重建 Graph Source IR', () => {
    const source = buildPreviewSourceIR(
      {
        type: 'scene',
        children: [
          {
            type: 'embed',
            kind: 'graph.graph',
            id: 'graph',
            props: {
              children: [
                {
                  type: 'embed',
                  kind: 'graph.block',
                  id: 'block',
                  props: { id: 'block' },
                },
              ],
            },
          },
        ],
      },
      {
        type: 'scene',
        version: 1,
        children: [
          {
            namespace: 'graph',
            type: 'graph',
            children: [
              {
                namespace: 'graph',
                type: 'block',
                id: 'block',
                padding: 8,
                gap: 8,
                children: [],
              },
            ],
          },
        ],
      },
      [],
    );

    expect(source.children).toEqual([
      {
        namespace: 'graph',
        type: 'graph',
        children: [{ namespace: 'graph', type: 'block', id: 'block' }],
      },
    ]);
  });
});
