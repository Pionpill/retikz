import type { CoreProviderContribution } from '@retikz/core';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { useMemo } from 'react';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';

const hookedDatasets = { sample: [{ value: 1 }] };
const hookedProviderKey = { capability: 'composite' as const, namespace: 'hooked', type: 'demo' };
const hookedProviderDependencies = {
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

const hookedEmbeddableAdapter: EmbeddableTier2Adapter = {
  displayName: 'HookedEmbeddable',
  contribute: () => ({
    node: { namespace: 'hooked', type: 'demo' },
    providerDependencies: hookedProviderDependencies,
  }),
};

const HookedEmbeddable: FC & {
  isTier2Embeddable?: true;
  embeddableAdapter?: EmbeddableTier2Adapter;
} = () => {
  useMemo(() => 1, []);
  return <Layout width={40} height={20} />;
};

HookedEmbeddable.displayName = 'HookedEmbeddable';
HookedEmbeddable.isTier2Embeddable = true;
HookedEmbeddable.embeddableAdapter = hookedEmbeddableAdapter;

const HookedEmbeddableDemo: FC = () => <HookedEmbeddable />;

describe('buildPreviewIR', () => {
  it('does not execute hookful embeddable root components', () => {
    const preview = buildPreviewIR(HookedEmbeddableDemo);

    expect(preview.ir.children).toEqual([{ namespace: 'hooked', type: 'demo' }]);
    expect(preview.contributions).toEqual([hookedProviderDependencies]);
  });
});
