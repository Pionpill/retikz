import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import type { CoreDependencyProvider, CoreProviderContribution, CoreProviderKey } from '../../../src';
import { defineShape, resolveCoreProviderDependencies } from '../../../src';

const key: CoreProviderKey = { capability: 'shape', name: 'cross' };

const makeDefinition = () =>
  defineShape({
    name: 'cross',
    paramsSchema: strictObject({}),
    computeCircumscribedGeometry: (halfWidth, halfHeight) => ({ halfWidth, halfHeight }),
    computeBoundaryPoint: (_bounds, toward) => toward,
    emit: () => [],
    resolveAnchor: () => undefined,
  });

const provider = (
  make: CoreDependencyProvider<{ profile: Readonly<{ label: string }> }>['makeDefinition'],
): CoreDependencyProvider<{ profile: Readonly<{ label: string }> }> => ({
  key,
  params: { profile: Object.freeze({ label: 'immutable' }) },
  makeDefinition: make,
});

const contribution = (
  entry: CoreDependencyProvider<{ profile: Readonly<{ label: string }> }>,
): CoreProviderContribution => ({
  roots: [key],
  providers: [entry],
});

describe('Core 提供者参数快照', () => {
  it('向提供者工厂提供不可变的参数列表', () => {
    const result = resolveCoreProviderDependencies({
      contributions: [
        contribution(
          provider(params => {
            expect(Object.isFrozen(params)).toBe(true);
            expect(Reflect.set(params, '1', {})).toBe(false);
            expect(params).not.toHaveProperty('other');

            return makeDefinition();
          }),
        ),
      ],
    });

    expect(result.shapes?.map(definition => definition.name)).toEqual(['cross']);
  });
});
