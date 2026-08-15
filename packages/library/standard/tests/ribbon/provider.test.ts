import type { IRScene } from '@retikz/core';

import { compileToScene, CURRENT_IR_VERSION, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { RibbonWidthProfileDefinition } from '../../src/ribbon';

import {
  BUILTIN_RIBBON_WIDTH_PROFILES,
  createRibbonProviderContribution,
  defineRibbonWidthProfile,
} from '../../src/ribbon';

const profile = (name: string, width: number): RibbonWidthProfileDefinition =>
  defineRibbonWidthProfile({ name, widthAt: () => width });

const profileScene = (name: string): IRScene => ({
  version: CURRENT_IR_VERSION,
  type: 'scene',
  children: [
    {
      type: 'path',
      kind: 'ribbon',
      kindOptions: { width: { kind: 'profile', name }, samples: 3 },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [40, 0] },
      ],
    },
  ],
});

describe('Standard Ribbon provider contribution', () => {
  it('uses one stable maker and contributes the official bulge profile by default', () => {
    const first = createRibbonProviderContribution();
    const second = createRibbonProviderContribution();
    const firstProvider = first.providers[0];
    const secondProvider = second.providers[0];

    expect(firstProvider.makeDefinition).toBe(secondProvider.makeDefinition);
    expect(firstProvider.datasets.bulge).toBe(BUILTIN_RIBBON_WIDTH_PROFILES[0]);

    const definitions = resolveCoreProviderDependencies({ contributions: [first] });
    expect(definitions.pathKinds).toHaveLength(1);
    expect(definitions.pathKinds).toMatchObject([{ name: 'ribbon' }]);
  });

  it('merges repeated profile references from multiple contributions into one Ribbon definition', () => {
    const custom = profile('custom', 8);
    const first = createRibbonProviderContribution([custom]);
    const second = createRibbonProviderContribution([custom]);
    const definitions = resolveCoreProviderDependencies({ contributions: [first, second] });

    expect(definitions.pathKinds).toHaveLength(1);
    expect(() =>
      compileToScene(profileScene('custom'), {
        pathKinds: definitions.pathKinds,
        padding: 0,
      }),
    ).not.toThrow();
  });

  it('fails loudly when contributions define the same profile name with different objects', () => {
    const first = createRibbonProviderContribution([profile('custom', 8)]);
    const second = createRibbonProviderContribution([profile('custom', 12)]);

    expect(() => resolveCoreProviderDependencies({ contributions: [first, second] })).toThrow(
      /dataset "custom" conflicts by identity/i,
    );
  });

  it.each(['', '   '])('rejects an invalid profile name while creating a contribution (%j)', name => {
    const invalidProfile: RibbonWidthProfileDefinition = { name, widthAt: () => 4 };

    expect(() => createRibbonProviderContribution([invalidProfile])).toThrow(/non-empty string/);
  });

  it('supports __proto__ as a profile name and compiles it through the merged dataset', () => {
    const custom = profile('__proto__', 8);
    const contribution = createRibbonProviderContribution([custom]);
    const provider = contribution.providers[0];

    expect(Object.hasOwn(provider.datasets, '__proto__')).toBe(true);
    expect(provider.datasets['__proto__']).toBe(custom);

    const definitions = resolveCoreProviderDependencies({ contributions: [contribution] });
    expect(() =>
      compileToScene(profileScene('__proto__'), {
        pathKinds: definitions.pathKinds,
        padding: 0,
      }),
    ).not.toThrow();
  });

  it('fails loudly when different contributions define __proto__ with different objects', () => {
    const first = createRibbonProviderContribution([profile('__proto__', 8)]);
    const second = createRibbonProviderContribution([profile('__proto__', 12)]);

    expect(() => resolveCoreProviderDependencies({ contributions: [first, second] })).toThrow(
      /dataset "__proto__" conflicts by identity/i,
    );
  });
});
