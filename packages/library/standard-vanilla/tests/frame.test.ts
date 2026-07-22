import { createFrame } from '@retikz/standard';
import { normalizeFigureSpec } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { FrameVanillaInput } from '../src';

import { axes, AxesVanillaAdapter, frame, FrameVanillaAdapter, grid, GridVanillaAdapter } from '../src';

const input: FrameVanillaInput = {
  label: 'Contract',
  children: [{ type: 'node', position: [0, 0], text: 'A' }],
};

describe('frame()', () => {
  it('derives the Frame scope identity from the Vanilla embed id', () => {
    const embed = frame('definition-contract', input);
    const contribution = FrameVanillaAdapter.lower(embed.props, {
      id: embed.id,
      kind: embed.kind,
      namespace: FrameVanillaAdapter.namespace,
      layerId: 'main',
      identityPath: ['main', embed.id],
    });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.frame', id: 'definition-contract' });
    expect(contribution.node).toEqual(createFrame({ id: 'definition-contract/frame', ...input }));
  });

  it('coexists with Grid and Axes and contributes all definitions once', () => {
    const figure = normalizeFigureSpec(
      {
        type: 'figure',
        version: 1,
        children: [
          grid('paper', { bounds: { min: [-2, -1], max: [2, 1] }, spacing: 1 }),
          axes('plane', { bounds: { x: { min: -2, max: 2 }, y: { min: -1, max: 1 } } }),
          frame('definition-contract', input),
        ],
      },
      { adapters: [GridVanillaAdapter, AxesVanillaAdapter, FrameVanillaAdapter] },
    );

    expect(figure.composites).toHaveLength(3);
    expect(figure.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame']);
  });
});
