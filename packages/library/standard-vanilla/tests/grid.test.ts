import { createGrid } from '@retikz/standard';
import { normalizeFigureSpec } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { grid, GridVanillaAdapter } from '../src';

describe('grid()', () => {
  it('creates an embed whose adapter lowers to the same Standard Grid IR', () => {
    const embed = grid('paper', {
      bounds: { start: [0, 0], end: [20, 10] },
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
          grid('first', { bounds: { start: [0, 0], end: [20, 10] }, spacing: 10 }),
          grid('second', { bounds: { start: [30, 0], end: [50, 10] }, spacing: 10 }),
        ],
      },
      { adapters: [GridVanillaAdapter] },
    );

    expect(figure.composites).toHaveLength(1);
  });

  it('accepts a center-form Cartesian position through the shared Grid input', () => {
    const input = {
      bounds: { position: [20, 10], width: 40, height: 20 },
      spacing: 10,
    } as const;
    const embed = grid('center', input);
    const contribution = GridVanillaAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      namespace: GridVanillaAdapter.namespace,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(contribution.node).toEqual(createGrid(input));
  });

  it('accepts a PolarPosition center through the shared Grid input', () => {
    const input = {
      bounds: {
        position: { origin: [10, 5], angle: 90, radius: 20 },
        width: 20,
        height: 10,
      },
      spacing: 10,
    } as const;
    const embed = grid('polar', input);
    const contribution = GridVanillaAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      namespace: GridVanillaAdapter.namespace,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(contribution.node).toEqual(createGrid(input));
  });
});
