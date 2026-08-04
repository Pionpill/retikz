import type { AxesInput } from '@retikz/standard';

import { createAxes } from '@retikz/standard';
import { normalizeFigureSpec } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { axes, AxesVanillaAdapter, grid, GridVanillaAdapter } from '../src';

const input: AxesInput = {
  origin: [100, 80],
  extent: { x: 40, y: { negative: 20, positive: 40 } },
  grid: { spacing: 1, offset: [0.5, -0.5], style: { dashPattern: [2, 1] } },
  x: {
    line: { arrows: 'both', arrowDetail: { shape: 'openStealth', scale: 1.25 } },
    ticks: { source: { kind: 'spacing', spacing: 10, extent: 'positive' } },
  },
  y: { ticks: { source: { kind: 'values', values: [-20, 20, 40] } } },
};

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
        children: [
          grid('paper', { bounds: { start: [-2, -1], end: [2, 1] }, line: { spacing: 1 } }),
          axes('plane', input),
        ],
      },
      { adapters: [GridVanillaAdapter, AxesVanillaAdapter] },
    );

    expect(figure.composites).toHaveLength(2);
    expect(figure.ir.children.map(child => child.type)).toEqual(['grid', 'axes']);
  });
});
