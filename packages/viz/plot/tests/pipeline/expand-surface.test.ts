import { describe, expect, expectTypeOf, it } from 'vitest';

import type { LowerPlotsOptions, MarkDataView } from '../../src/pipeline/expand';
import type { CoordinateScopeRegistry, CoordinateScopeRegistryEntry } from '../../src/resolve/composition';
import type { CoordinateFrameResolution, CoordinateResolveContext } from '../../src/resolve/coordinate';

import * as expand from '../../src/pipeline/expand';
import { coordinateScopeIdOf, resolveCoordinateScopeRegistry } from '../../src/resolve/composition';
import { resolveCoordinateFrame } from '../../src/resolve/coordinate';

describe('expand pipeline stable surface', () => {
  it('keeps the established runtime exports available', () => {
    expect(
      [
        expand.lowerPlots,
        expand.prepareRows,
        expand.validateFieldMaps,
        resolveCoordinateFrame,
        coordinateScopeIdOf,
        resolveCoordinateScopeRegistry,
      ].every(value => typeof value === 'function'),
    ).toBe(true);
    expect(expand).not.toHaveProperty('coordinateScopeIdOf');
    expect(expand).not.toHaveProperty('resolveCoordinateScopeRegistry');
  });

  it('keeps the established type exports available', () => {
    expectTypeOf<CoordinateFrameResolution>().toBeObject();
    expectTypeOf<CoordinateScopeRegistry>().toBeObject();
    expectTypeOf<CoordinateScopeRegistryEntry>().toBeObject();
    expectTypeOf<LowerPlotsOptions>().toBeObject();
    expectTypeOf<MarkDataView>().toBeObject();
    expectTypeOf<CoordinateResolveContext>().toBeObject();
  });
});
