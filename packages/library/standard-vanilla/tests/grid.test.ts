import { describe, expect, it } from 'vitest';

import { normalizeFigureSpec } from '@retikz/vanilla';

import { grid, GridVanillaAdapter } from '../src';

describe('grid()', () => {
  it('creates an embed whose adapter lowers to the same Standard Grid IR', () => {
    const embed = grid('paper', {
      bounds: { min: [0, 0], max: [20, 10] },
      spacing: 10,
    });
    const contribution = GridVanillaAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      namespace: GridVanillaAdapter.namespace,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.grid', id: 'paper' });
    expect(contribution.node).toMatchObject({ namespace: 'standard', type: 'grid' });
    expect(contribution.makeComposites({})).toHaveLength(1);
  });

  it('merges multiple Grid embeds through one stable definition maker', () => {
    const figure = normalizeFigureSpec(
      {
        type: 'figure',
        version: 1,
        children: [
          grid('first', { bounds: { min: [0, 0], max: [20, 10] }, spacing: 10 }),
          grid('second', { bounds: { min: [30, 0], max: [50, 10] }, spacing: 10 }),
        ],
      },
      { adapters: [GridVanillaAdapter] },
    );

    expect(figure.composites).toHaveLength(1);
  });
});
