import type { CoreProviderContribution } from '@retikz/core';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { useMemo } from 'react';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';

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

describe('buildPreviewIR', () => {
  it('does not execute hookful embeddable root components', () => {
    const preview = buildPreviewIR(HookedEmbeddableDemo);

    expect(preview.ir.children).toEqual([{ namespace: 'hooked', type: 'demo' }]);
    expect(preview.contributions).toEqual([hookedCompositeDependencies]);
  });
});
