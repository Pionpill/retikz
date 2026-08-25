import { describe, expect, it } from 'vitest';

import * as plot from '../src';

describe('@retikz/plot public surface', () => {
  it('exports the facet configuration schema and composition resolver from the package root', () => {
    const publicSurface = plot as Record<string, unknown>;

    expect(publicSurface.PlotFacetConfigurationSchema).toBeDefined();
    expect(publicSurface.resolvePlotFacetComposition).toBeTypeOf('function');
  });

  it('exports Plot-owned facet partition atoms from the package root', () => {
    const publicSurface = plot as Record<string, unknown>;

    expect(publicSurface.PlotPartitionScalarSchema).toBeDefined();
    expect(publicSurface.PlotPartitionDimensionSchema).toBeDefined();
    expect(publicSurface.PlotFacetOptionsSchema).toBeDefined();
  });
});
