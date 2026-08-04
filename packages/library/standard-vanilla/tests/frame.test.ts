import { createFrame } from '@retikz/standard';
import { normalizeFigureSpec } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { FrameVanillaInput } from '../src';

import {
  axes,
  AxesVanillaAdapter,
  frame,
  frameDescription,
  frameTitle,
  FrameVanillaAdapter,
  grid,
  GridVanillaAdapter,
} from '../src';

const input: FrameVanillaInput = {
  padding: 12,
  border: { cornerRadius: 6 },
  headerDirection: 'vertical',
  title: frameTitle({ text: 'Contract', font: { family: 'serif' } }),
  description: frameDescription({ text: 'One registry contract.', maxTextWidth: 220 }),
  children: [{ type: 'node', position: [0, 0], text: 'A' }],
};

describe('frame()', () => {
  it('validates JSON-safe title and description builders', () => {
    expect(frameTitle({ text: 'Title', padding: 2 })).toEqual({ text: 'Title', padding: 2 });
    expect(frameDescription({ text: '', opacity: 0.6 })).toEqual({ text: '', opacity: 0.6 });
  });

  it('derives the Frame identity and canonical IR from the Vanilla embed id', () => {
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
          grid('paper', { bounds: { start: [-2, -1], end: [2, 1] }, line: { spacing: 1 } }),
          axes('plane', { x: { extent: 20 }, y: { extent: 20 } }),
          frame('definition-contract', input),
        ],
      },
      { adapters: [GridVanillaAdapter, AxesVanillaAdapter, FrameVanillaAdapter] },
    );

    expect(figure.composites).toHaveLength(3);
    expect(figure.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame']);
    expect(figure.ir.children[2]).toEqual(createFrame({ id: 'definition-contract/frame', ...input }));
  });
});
