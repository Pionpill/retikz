import type { CoreProviderContribution } from '@retikz/core';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { ChartData, ChartLayout } from '@retikz/chart-react';
import { BubbleChart, BubbleEncodings, ScatterChart, ScatterEncodings } from '@retikz/chart-react/point';
import { Entity, Graph } from '@retikz/graph-react';
import { Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { useMemo } from 'react';
import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR, collectPreviewChartSources } from '../../src/modules/docs/components/component-preview/utils';
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
});
