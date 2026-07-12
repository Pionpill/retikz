import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  CoordinateFrameResolution,
  CoordinateScopeRegistry,
  CoordinateScopeRegistryEntry,
  LowerPlotsOptions,
  MarkDataView,
  ResolveFrameParams,
} from '../../src/pipeline/expand';

import {
  coordinateScopeIdOf,
  lowerPlots,
  prepareRows,
  resolveCoordinateScopeRegistry,
  resolveFrame,
  validateFieldMaps,
} from '../../src/pipeline/expand';

describe('expand pipeline stable surface', () => {
  it('keeps the established runtime exports available', () => {
    expect(
      [
        coordinateScopeIdOf,
        lowerPlots,
        prepareRows,
        resolveCoordinateScopeRegistry,
        resolveFrame,
        validateFieldMaps,
      ].every(value => typeof value === 'function'),
    ).toBe(true);
  });

  it('keeps the established type exports available', () => {
    expectTypeOf<CoordinateFrameResolution>().toBeObject();
    expectTypeOf<CoordinateScopeRegistry>().toBeObject();
    expectTypeOf<CoordinateScopeRegistryEntry>().toBeObject();
    expectTypeOf<LowerPlotsOptions>().toBeObject();
    expectTypeOf<MarkDataView>().toBeObject();
    expectTypeOf<ResolveFrameParams>().toBeObject();
  });
});
