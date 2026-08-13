import { describe, expect, expectTypeOf, it } from 'vitest';

import type { CompositeDependencyContribution, CompositeDependencyProvider, CompositeProviderKey } from '../../../src';

describe('Composite dependency provider contract', () => {
  it('exposes readonly qualified keys, providers, and contributions', () => {
    const key: CompositeProviderKey = { namespace: 'third', type: 'card' };
    const provider: CompositeDependencyProvider = {
      key,
      dependencies: [],
      datasets: {},
      makeDefinition: () => {
        throw new Error('not materialized by this type contract test');
      },
    };
    const contribution: CompositeDependencyContribution = {
      roots: [key],
      providers: [provider],
    };

    expectTypeOf(key).toEqualTypeOf<Readonly<{ namespace: string; type: string }>>();
    expectTypeOf(provider.dependencies).toEqualTypeOf<ReadonlyArray<CompositeProviderKey>>();
    expectTypeOf(contribution.providers).toEqualTypeOf<ReadonlyArray<CompositeDependencyProvider>>();
    expect(contribution.roots).toEqual([{ namespace: 'third', type: 'card' }]);
  });
});
