import { createSurface, FrameProvider, SurfaceProvider } from '@retikz/standard';
import { normalizeFigureSpec } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { frame, FrameVanillaAdapter, surface, surfaceChild, SurfaceVanillaAdapter } from '../src';

const context = {
  id: 'panel',
  kind: 'standard.surface',
  layerId: 'main',
  identityPath: ['main', 'panel'],
};

describe('surface()', () => {
  it('wraps a raw Core child without inventing child dependencies', () => {
    const child = surfaceChild({ type: 'node', position: [0, 0], text: 'A' });
    const contribution = SurfaceVanillaAdapter.lower({ padding: 4, child }, context);

    expect(contribution.node).toEqual(
      createSurface({
        namespace: 'standard',
        type: 'surface',
        id: 'panel/surface',
        padding: 4,
        child: { type: 'node', position: [0, 0], text: 'A' },
      }),
    );
    expect(contribution.providerDependencies).toEqual({
      roots: [SurfaceProvider.key],
      providers: [SurfaceProvider],
    });
  });

  it('preserves explicit nested Tier-2 dependencies after Surface in authored order', () => {
    const childEmbed = frame('card', { children: [{ type: 'node', position: [0, 0], text: 'A' }] });
    const childContribution = FrameVanillaAdapter.lower(childEmbed.props, {
      id: childEmbed.id,
      kind: childEmbed.kind,
      layerId: 'main',
      identityPath: ['main', childEmbed.id],
    });
    const contribution = SurfaceVanillaAdapter.lower(
      { child: surfaceChild(childContribution.node, childContribution.providerDependencies) },
      context,
    );

    expect(contribution.providerDependencies.roots).toEqual([SurfaceProvider.key, FrameProvider.key]);
    expect(contribution.providerDependencies.providers).toEqual([SurfaceProvider, FrameProvider]);
  });

  it('normalizes through the public Vanilla embed without leaking runtime child metadata into IR', () => {
    const result = normalizeFigureSpec(
      {
        type: 'figure',
        version: 1,
        children: [surface('panel', { child: surfaceChild({ type: 'node', position: [0, 0] }) })],
      },
      { adapters: [SurfaceVanillaAdapter] },
    );

    expect(result.ir.children[0]).toEqual(
      createSurface({
        namespace: 'standard',
        type: 'surface',
        id: 'panel/surface',
        child: { type: 'node', position: [0, 0] },
      }),
    );
    expect(JSON.stringify(result.ir)).not.toContain('providerDependencies');
  });
});
