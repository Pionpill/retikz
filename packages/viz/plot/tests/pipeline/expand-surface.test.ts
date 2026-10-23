import type { IRScene } from '@retikz/core';
import { compileToScene, CURRENT_IR_VERSION, resolveCoreProviderDependencies } from '@retikz/core';
import { BUILTIN_RIBBON_WIDTH_PROFILES, RibbonPathKindDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import * as expand from '../../src/pipeline/expand';
import type { LowerPlotsOptions, PlotDefinitions, PlotImplementations } from '../../src/pipeline/expand';
import { createPlotProviderContribution } from '../../src/pipeline/expand';
import { coordinateScopeIdOf, resolveCoordinateScopeRegistry } from '../../src/resolve/composition';
import { resolveCoordinateFrame } from '../../src/resolve/coordinate';

describe('expand pipeline stable surface', () => {
  it('合并不同分组对象中的相同共享字段，允许各 Plot 使用不同尺寸', () => {
    const channels: PlotDefinitions['channels'] = [];
    const transforms: PlotImplementations['transforms'] = [];
    const contributions = [200, 400].map(width =>
      createPlotProviderContribution(
        {},
        {
          layout: { width, height: width / 2, fontSize: 12 },
          definitions: { channels },
          implementations: { transforms },
        },
      ),
    );

    const definitions = resolveCoreProviderDependencies({ contributions });
    expect(() =>
      compileToScene({ version: CURRENT_IR_VERSION, type: 'scene', children: [] }, definitions),
    ).not.toThrow();
  });

  it.each<[LowerPlotsOptions, LowerPlotsOptions, string]>([
    [{ layout: { fontSize: 12 } }, { layout: { fontSize: 16 } }, 'layout.fontSize'],
    [{ definitions: { channels: [] } }, { definitions: { channels: [] } }, 'definitions.channels'],
    [{ implementations: { transforms: [] } }, { implementations: { transforms: [] } }, 'implementations.transforms'],
  ])('拒绝冲突的共享字段：%j / %j', (first, second, field) => {
    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [createPlotProviderContribution({}, first), createPlotProviderContribution({}, second)],
      }),
    ).toThrow(field);
  });

  it('keeps the established runtime exports available', () => {
    expect(
      [
        expand.lowerPlots,
        expand.prepareRows,
        expand.assertDatasetFieldMaps,
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
    expect(ribbonProvider?.datasets['profile:bulge']).toBe(BUILTIN_RIBBON_WIDTH_PROFILES[0]);

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
          kindOptions: {
            width: { kind: 'profile', name: 'bulge', params: { base: 4, peak: 8 } },
            sampling: { kind: 'fixed', samples: 3 },
          },
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
