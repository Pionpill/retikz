import { buildIRWithContributions, Node } from '@retikz/react';
import { createSurface, FrameProvider, SurfaceProvider } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { Frame, Surface } from '../../src';

describe('<Surface>', () => {
  it('converts exactly one Core child to canonical Surface IR', () => {
    const contribution = Surface.embeddableAdapter.contribute({
      id: 'panel',
      padding: { x: 4, y: 2 },
      children: <Node position={[0, 0]} text="A" />,
    });

    expect(contribution.node).toEqual(
      createSurface({
        namespace: 'standard',
        type: 'surface',
        id: 'panel',
        padding: { x: 4, y: 2 },
        child: { type: 'node', position: [0, 0], text: 'A' },
      }),
    );
    expect(contribution.compositeDependencies).toEqual({
      roots: [SurfaceProvider.key],
      providers: [SurfaceProvider],
    });
  });

  it('preserves nested Tier-2 roots and providers after Surface in authored order', () => {
    const result = buildIRWithContributions(
      <Surface id="panel">
        <Frame id="card">
          <Node position={[0, 0]} text="A" />
        </Frame>
      </Surface>,
    );

    expect(result.ir.children).toHaveLength(1);
    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0]?.roots).toEqual([SurfaceProvider.key, FrameProvider.key]);
    expect(result.contributions[0]?.providers).toEqual([SurfaceProvider, FrameProvider]);
    expect(result.ir.children[0]).toMatchObject({
      namespace: 'standard',
      type: 'surface',
      id: 'panel',
      child: { namespace: 'standard', type: 'frame', id: 'card' },
    });
  });

  it('fails loudly unless children lower to exactly one IR child', () => {
    expect(() => Surface.embeddableAdapter.contribute({ children: null })).toThrow(/exactly one/i);
    expect(() =>
      Surface.embeddableAdapter.contribute({
        children: (
          <>
            <Node position={[0, 0]} />
            <Node position={[1, 1]} />
          </>
        ),
      }),
    ).toThrow(/exactly one/i);
  });
});
