import { createSurface, FrameProvider, SurfaceProvider } from '@retikz/standard';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { frame, FrameInputEmbedAdapter, surface, surfaceChild, SurfaceInputEmbedAdapter } from '../src';

describe('surface()', () => {
  it('wraps a raw Core child without inventing child dependencies', () => {
    const child = surfaceChild({ type: 'node', position: [0, 0], text: 'A' });
    const normalized = normalizeScene(scene({ children: [surface('panel', { padding: 4, child })] }), {
      adapters: [SurfaceInputEmbedAdapter],
    });

    expect(normalized.ir.children[0]).toEqual(
      createSurface({
        namespace: 'standard',
        type: 'surface',
        id: 'panel/surface',
        padding: 4,
        child: { type: 'node', position: [0, 0], text: 'A' },
      }),
    );
    expect(normalized.contributions[0]).toEqual({
      roots: [SurfaceProvider.key],
      providers: [SurfaceProvider],
    });
  });

  it('preserves explicit nested Tier-2 dependencies after Surface in authored order', () => {
    const childEmbed = frame('card', { children: [{ type: 'node', position: [0, 0], text: 'A' }] });
    const normalized = normalizeScene(scene({ children: [surface('panel', { child: surfaceChild(childEmbed) })] }), {
      adapters: [SurfaceInputEmbedAdapter, FrameInputEmbedAdapter],
    });

    expect(normalized.contributions[0]?.roots).toEqual([SurfaceProvider.key, FrameProvider.key]);
    expect(normalized.contributions[0]?.providers).toEqual([SurfaceProvider, FrameProvider]);
  });

  it('normalizes through the public Vanilla embed without leaking runtime child metadata into IR', () => {
    const result = normalizeScene(
      scene({
        children: [surface('panel', { child: surfaceChild({ type: 'node', position: [0, 0] }) })],
      }),
      { adapters: [SurfaceInputEmbedAdapter] },
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
