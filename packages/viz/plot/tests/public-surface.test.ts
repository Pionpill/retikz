import { describe, expect, it } from 'vitest';

import * as plot from '../src';

describe('@retikz/plot public surface', () => {
  it('exports the facet configuration schema and composition resolver from the package root', () => {
    const publicSurface = plot as Record<string, unknown>;

    expect(publicSurface.PlotFacetConfigurationSchema).toBeDefined();
    expect(publicSurface.resolvePlotFacetComposition).toBeTypeOf('function');
  });
});
