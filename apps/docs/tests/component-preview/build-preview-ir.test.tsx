import type { CoreProviderContribution } from '@retikz/core';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { Entity, Graph } from '@retikz/graph-react';
import { Layout } from '@retikz/react';
import { useMemo } from 'react';
import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
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
});
