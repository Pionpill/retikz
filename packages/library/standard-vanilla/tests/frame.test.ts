import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { InputFrame } from '../src';

import {
  axes,
  AxesInputEmbedAdapter,
  frame,
  frameDescription,
  FrameInputEmbedAdapter,
  frameTitle,
  grid,
  GridInputEmbedAdapter,
} from '../src';

const input: InputFrame = {
  padding: 12,
  border: { style: { stroke: '#0284c7', zIndex: 4 }, cornerRadius: 6 },
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
    const normalized = normalizeScene(scene({ children: [embed] }), { adapters: [FrameInputEmbedAdapter] });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.frame', id: 'definition-contract' });
    expect(normalized.ir.children[0]).toMatchObject({
      namespace: 'standard',
      type: 'frame',
      id: 'definition-contract/frame',
      padding: 12,
      title: { text: 'Contract', font: { family: 'serif' } },
      description: { text: 'One registry contract.', maxTextWidth: 220 },
      children: [{ type: 'node', position: [0, 0], text: 'A' }],
    });
  });

  it('coexists with Grid and Axes and contributes all definitions once', () => {
    const result = normalizeScene(
      scene({
        children: [
          grid('paper', { bounds: { start: [-2, -1], end: [2, 1] }, line: { spacing: 1 } }),
          axes('plane', { x: { extent: 20 }, y: { extent: 20 } }),
          frame('definition-contract', input),
        ],
      }),
      { adapters: [GridInputEmbedAdapter, AxesInputEmbedAdapter, FrameInputEmbedAdapter] },
    );

    expect(result.contributions).toHaveLength(3);
    expect(result.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame']);
    expect(result.ir.children[2]).toMatchObject({
      namespace: 'standard',
      type: 'frame',
      id: 'definition-contract/frame',
      children: [{ type: 'node', position: [0, 0], text: 'A' }],
    });
  });
});
