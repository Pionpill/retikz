import { describe, expect, expectTypeOf, it } from 'vitest';

import type { CoreDependencyProvider, CoreProviderContribution, CoreProviderKey } from '../../../src';

import { CoreProviderCapability } from '../../../src';

describe('Core provider dependency contract', () => {
  it('exposes readonly keys, providers, and contributions for named and composite capabilities', () => {
    const shapeKey: CoreProviderKey = { capability: 'shape', name: 'cross' };
    const clipKey: CoreProviderKey = { capability: 'clip', name: 'ticket' };
    const compositeKey: CoreProviderKey = { capability: 'composite', namespace: 'third', type: 'card' };
    const provider: CoreDependencyProvider = {
      key: shapeKey,
      dependencies: [compositeKey],
      datasets: {},
      makeDefinition: () => {
        throw new Error('not materialized by this type contract test');
      },
    };
    const contribution: CoreProviderContribution = {
      roots: [shapeKey, clipKey, compositeKey],
      providers: [provider],
    };

    expectTypeOf(shapeKey).toMatchTypeOf<CoreProviderKey>();
    expectTypeOf(provider.dependencies).toEqualTypeOf<ReadonlyArray<CoreProviderKey>>();
    expectTypeOf(contribution.providers).toEqualTypeOf<ReadonlyArray<CoreDependencyProvider>>();
    expect(contribution.roots).toEqual([
      { capability: 'shape', name: 'cross' },
      { capability: 'clip', name: 'ticket' },
      { capability: 'composite', namespace: 'third', type: 'card' },
    ]);
    expect(CoreProviderCapability).not.toHaveProperty('ClipShape');
  });
});
