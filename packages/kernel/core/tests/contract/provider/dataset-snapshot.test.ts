import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CoreDependencyProvider, CoreProviderContribution, CoreProviderKey } from '../../../src';

import { defineShape, resolveCoreProviderDependencies } from '../../../src';

const key: CoreProviderKey = { capability: 'shape', name: 'cross' };

const makeDefinition = () =>
  defineShape({
    name: 'cross',
    paramsSchema: z.strictObject({}),
    circumscribe: (halfWidth, halfHeight) => ({ halfWidth, halfHeight }),
    boundaryPoint: (_bounds, toward) => toward,
    emit: () => [],
    anchor: () => undefined,
  });

const provider = (make: CoreDependencyProvider['makeDefinition']): CoreDependencyProvider => ({
  key,
  dependencies: [],
  datasets: { profile: Object.freeze({ label: 'immutable' }) },
  makeDefinition: make,
});

const contribution = (entry: CoreDependencyProvider): CoreProviderContribution => ({ roots: [key], providers: [entry] });

describe('Core provider dataset snapshot', () => {
  it('exposes an immutable dataset record to the provider maker', () => {
    const result = resolveCoreProviderDependencies({
      contributions: [
        contribution(
          provider(datasets => {
            expect(Object.isFrozen(datasets)).toBe(true);
            expect(Reflect.set(datasets, 'other', {})).toBe(false);
            expect(datasets).not.toHaveProperty('other');
            return makeDefinition();
          }),
        ),
      ],
    });

    expect(result.shapes?.map(definition => definition.name)).toEqual(['cross']);
  });
});
