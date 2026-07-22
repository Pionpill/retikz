import { createAxes } from '@retikz/standard';
import { normalizeFigureSpec } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { axes, AxesVanillaAdapter, grid, GridVanillaAdapter } from '../src';

const input = {
  bounds: { x: { min: -2, max: 2 }, y: { min: -1, max: 1 } },
  grid: { spacing: 1 },
  ticks: { x: 1, y: 1 },
} as const;

describe('axes()', () => {
  it('creates an embed that contributes canonical Axes IR', () => {
    const embed = axes('plane', input);
    const contribution = AxesVanillaAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      namespace: AxesVanillaAdapter.namespace,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.axes', id: 'plane' });
    expect(contribution.node).toEqual(createAxes(input));
  });

  it('coexists with Grid and contributes both definitions once', () => {
    const figure = normalizeFigureSpec(
      {
        type: 'figure',
        version: 1,
        children: [grid('paper', { bounds: { min: [-2, -1], max: [2, 1] }, spacing: 1 }), axes('plane', input)],
      },
      { adapters: [GridVanillaAdapter, AxesVanillaAdapter] },
    );

    expect(figure.composites).toHaveLength(2);
    expect(figure.ir.children.map(child => child.type)).toEqual(['grid', 'axes']);
  });
});
