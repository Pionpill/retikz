import type { IRScene } from '@retikz/core';

import { compileToScene, CURRENT_IR_VERSION, resolveCoreProviderDependencies } from '@retikz/core';
import { BUILTIN_RIBBON_WIDTH_PROFILES, RibbonPathKindDefinition } from '@retikz/standard/ribbon';
import { describe, expect, it } from 'vitest';

import * as expand from '../../src/pipeline/expand';
import { createPlotProviderContribution } from '../../src/pipeline/expand';
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

  it('contributes the Standard Ribbon path kind and its profile dataset explicitly', () => {
    const contribution = createPlotProviderContribution({});
    expect(contribution.roots).toContainEqual({ capability: 'pathKind', name: 'ribbon' });

    const ribbonProvider = contribution.providers.find(
      provider => provider.key.capability === 'pathKind' && provider.key.name === 'ribbon',
    );
    expect(ribbonProvider).toBeDefined();
    expect(ribbonProvider?.datasets.bulge).toBe(BUILTIN_RIBBON_WIDTH_PROFILES[0]);

    const definitions = resolveCoreProviderDependencies({ contributions: [contribution] });
    const ribbonDefinitions = definitions.pathKinds?.filter(definition => definition.name === 'ribbon') ?? [];
    expect(ribbonDefinitions).toHaveLength(1);
    expect(ribbonDefinitions[0]?.schema).toBe(RibbonPathKindDefinition.schema);

    const ir: IRScene = {
      version: CURRENT_IR_VERSION,
      type: 'scene',
      children: [
        {
          type: 'path',
          kind: 'ribbon',
          kindOptions: { width: { kind: 'profile', name: 'bulge', params: { base: 4, peak: 8 } }, samples: 3 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [40, 0] },
          ],
        },
      ],
    };
    expect(() => compileToScene(ir, { ...definitions, padding: 0 })).not.toThrow();
  });
});
