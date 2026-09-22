import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { InputFrame } from '../src/presentation';
import {
  axes,
  AxesInputEmbedAdapter,
  frame,
  frameDescription,
  FrameInputEmbedAdapter,
  frameTitle,
  grid,
  GridInputEmbedAdapter,
} from '../src/presentation';

const input: InputFrame = {
  padding: 12,
  border: { style: { stroke: '#0284c7', zIndex: 4 }, cornerRadius: 6 },
  headerDirection: 'vertical',
  title: frameTitle({
    text: 'Contract',
    style: { font: { family: 'serif' } },
  }),
  description: frameDescription({
    text: 'One registry contract.',
    layout: { maxTextWidth: 220 },
  }),
  children: [{ type: 'node', position: [0, 0], text: 'A' }],
};

describe('frame()', () => {
  it('validates JSON-safe title and description builders', () => {
    expect(
      frameTitle({
        text: 'Title',
        layout: { padding: 2 },
      }),
    ).toEqual({
      text: 'Title',
      layout: { padding: 2 },
    });
    expect(
      frameDescription({
        text: '',
        style: { opacity: 0.6 },
      }),
    ).toEqual({
      text: '',
      style: { opacity: 0.6 },
    });
  });

  it('keeps an anonymous Frame anonymous through its embed', () => {
    const embed = frame(input);
    const normalized = normalizeScene(scene({ children: [embed] }), { adapters: [FrameInputEmbedAdapter] });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.frame' });
    expect(embed).not.toHaveProperty('id');
    expect(normalized.ir.children[0]).toMatchObject({
      namespace: 'standard',
      type: 'frame',
      padding: 12,
      title: { text: 'Contract', style: { font: { family: 'serif' } } },
      description: { text: 'One registry contract.', layout: { maxTextWidth: 220 } },
      children: [{ type: 'node', position: [0, 0], text: 'A' }],
    });
    expect(normalized.ir.children[0]).not.toHaveProperty('id');

    const explicit = normalizeScene(scene({ children: [frame({ ...input, id: 'frame-model' })] }), {
      adapters: [FrameInputEmbedAdapter],
    });
    expect(explicit.ir.children[0]).toHaveProperty('id', 'frame-model');
  });

  it('coexists with Grid and Axes and contributes all definitions once', () => {
    const result = normalizeScene(
      scene({
        children: [
          grid({ bounds: { start: [-2, -1], end: [2, 1] }, line: { spacing: 1 } }),
          axes({ x: { extent: 20 }, y: { extent: 20 } }),
          frame(input),
        ],
      }),
      { adapters: [GridInputEmbedAdapter, AxesInputEmbedAdapter, FrameInputEmbedAdapter] },
    );

    expect(result.contributions).toHaveLength(3);
    expect(result.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame']);
    expect(result.ir.children[2]).toMatchObject({
      namespace: 'standard',
      type: 'frame',
      children: [{ type: 'node', position: [0, 0], text: 'A' }],
    });
    expect(result.ir.children[2]).not.toHaveProperty('id');
  });
});
