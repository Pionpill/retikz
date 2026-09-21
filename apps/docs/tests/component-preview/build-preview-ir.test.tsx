import { ChartData, ChartLayout } from '@retikz/chart-react';
import { BubbleChart, BubbleEncodings, ScatterChart, ScatterEncodings } from '@retikz/chart-react/point';
import type { CoreProviderContribution } from '@retikz/core';
import { Entity, Graph } from '@retikz/graph-react';
import { Plot, PointMark } from '@retikz/plot-react';
import { Draw, Layout, Node } from '@retikz/react';
import type { LayoutProps } from '@retikz/react';
import { Circle, Ellipse, Rectangle, RegularPolygon, Star, Arc, Sector } from '@retikz/standard-react/shape';
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
import { createGraphPreviewSource } from '../../src/modules/docs/preview';

const hookedDatasets = { sample: [{ value: 1 }] };
const hookedProviderKey = { capability: 'composite' as const, namespace: 'hooked', type: 'demo' };
const hookedCompositeDependencies = {
  roots: [hookedProviderKey],
  providers: [
    {
      key: hookedProviderKey,
      dependencies: [],
      datasets: hookedDatasets,
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
    <PointMark x="category" y="value" />
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
  it('renders Standard shape semantics through IR and Vanilla preview with family helpers', () => {
    const preview = buildPreviewIR(() => (
      <Layout>
        <Circle center={[0, 0]} radius={10} />
        <Ellipse center={[40, 0]} radius={{ x: 20, y: 10 }} />
        <Rectangle center={[80, 0]} side={20} />
        <RegularPolygon center={[120, 0]} sides={5} radius={10} />
        <Star center={[160, 0]} outerRadius={10} points={5} />
        <Arc center={[200, 0]} radius={10} startAngle={0} endAngle={90} />
        <Sector center={[240, 0]} radius={10} innerRadius={5} startAngle={0} endAngle={90} />
      </Layout>
    ));
    expect(preview.sourceIr.children).toHaveLength(7);
    expect(preview.sourceIr.children[0]).toMatchObject({ namespace: 'standard', type: 'circle' });
    const vanilla = buildVanillaPreview(preview);
    for (const kind of ['circle', 'ellipse', 'rectangle', 'regularPolygon', 'star', 'arc', 'sector'])
      expect(vanilla.code).toContain(`shape.${kind}(`);
    expect(vanilla.code).toContain("from '@retikz/standard-vanilla/shape'");
    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.svg).toContain('<path');
  });
  it('preserves rootScope styles and defaults in Source IR and Vanilla output', () => {
    const preview = buildPreviewIR(() => (
      <Layout
        rootScope={{ style: { stroke: '#123456', strokeWidth: 3 }, defaults: { node: { layout: { padding: 12 } } } }}
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
        style: { stroke: '#123456', strokeWidth: 3 },
        defaults: { node: { layout: { padding: 12 } } },
        children: [{ type: 'node', id: 'A' }, { type: 'node', id: 'B' }, { type: 'path' }],
      });
    }
    const vanilla = buildVanillaPreview(preview);
    expect(vanilla.code).toContain('scope(');
    expect(vanilla.code).toContain('#123456');
    expect(vanilla.code).toContain('padding: 12');
    expect(vanilla.svg).toContain('stroke="#123456"');
  });

  it.each<LayoutProps['rootScope']>([undefined, {}, { style: {} }, { defaults: { reset: false } }])(
    'does not add a Scope for ineffective rootScope %j or host props',
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

  it('keeps complete IR unchanged when rootScope is supplied', () => {
    const ir = { type: 'scene' as const, version: 1 as const, children: [] };
    const preview = buildPreviewIR(() => <Layout ir={ir} rootScope={{ style: { stroke: 'red' } }} />);
    expect(preview.sourceIr).toBe(ir);
    expect(preview.ir).toBe(ir);
  });

  it('does not execute hookful embeddable root components', () => {
    const preview = buildPreviewIR(HookedEmbeddableDemo);

    expect(preview.ir.children).toEqual([{ namespace: 'hooked', type: 'demo' }]);
    expect(preview.contributions).toEqual([hookedCompositeDependencies]);
  });

  it('retains the normalized Scene IR without a Graph-specific input projection', () => {
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

  it('promotes standalone Graph host props when deriving canonical preview IR', () => {
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

  it('removes standalone Plot host props before deriving embedded preview content', () => {
    const preview = buildPreviewIR(PlotStandaloneDemo);

    expect(preview).toMatchObject({ width: 240, height: 120 });
    expect(preview.ir.children[0]).toMatchObject({ namespace: 'plot', type: 'plot', width: 240, height: 120 });
  });

  it('reads standalone dimensions from ChartLayout while preserving an explicit Source layout', () => {
    const preview = buildPreviewIR(ChartStandaloneDemo);

    expect(preview).toMatchObject({ width: 640, height: 360 });
    expect(preview.sourceIr.children[0]).toMatchObject({
      namespace: 'chart',
      type: 'point',
      layout: { width: 320, height: 180 },
    });
  });

  it('collects the exact Bubble Source from the React authoring tree', () => {
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

  it('rebuilds Graph Source IR from authoring input instead of runtime defaults', () => {
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
