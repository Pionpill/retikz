import { createGrid, GridDefinition, LegendContentKind } from '@retikz/standard';
import {
  axes,
  AxesInputEmbedAdapter,
  frame,
  FrameInputEmbedAdapter,
  grid,
  GridInputEmbedAdapter,
  legend,
  LegendInputEmbedAdapter,
  StandardInputEmbedAdapters,
  surface,
  surfaceChild,
  SurfaceInputEmbedAdapter,
} from '@retikz/standard-vanilla';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

const input = scene({
  children: [
    grid('paper', { bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } }),
    axes('plane', { x: { extent: 20 }, y: { extent: 20 } }),
    frame('contract', { children: [{ type: 'node', position: [0, 0], text: 'Contract' }] }),
    surface('callout', { child: surfaceChild({ type: 'node', position: [0, 0], text: 'Surface' }) }),
    legend('status', {
      content: {
        kind: LegendContentKind.Items,
        items: [{ key: 'node', sample: { type: 'node', position: [0, 0], text: 'N' } }],
      },
    }),
  ],
});

describe('Standard Vanilla definition loading', () => {
  it('provides the current adapter catalog once in stable frozen order', () => {
    expect(StandardInputEmbedAdapters).toEqual([
      GridInputEmbedAdapter,
      AxesInputEmbedAdapter,
      FrameInputEmbedAdapter,
      SurfaceInputEmbedAdapter,
      LegendInputEmbedAdapter,
    ]);
    expect(Object.isFrozen(StandardInputEmbedAdapters)).toBe(true);
    expect(Object.isFrozen(GridInputEmbedAdapter)).toBe(false);
  });

  it('normalizes all current embeds with the all-adapters preset', () => {
    const normalized = normalizeScene(input, { adapters: StandardInputEmbedAdapters });

    expect(normalized.contributions).toHaveLength(5);
    expect(normalized.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame', 'surface', 'legend']);
  });

  it('keeps partial adapter selection explicit', () => {
    expect(() => normalizeScene(input, { adapters: [GridInputEmbedAdapter, FrameInputEmbedAdapter] })).toThrow(
      /kind "standard\.axes" but no adapter was provided/i,
    );
  });

  it('compiles direct Standard IR with explicit definitions and no adapters', () => {
    const ir = {
      type: 'scene' as const,
      version: 1 as const,
      children: [createGrid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })],
    };

    expect(() => renderToSvgString(ir, { compile: { composites: [GridDefinition] } })).not.toThrow();
  });

  it('deduplicates the same explicit definition object and rejects a different object at the same key', () => {
    expect(() =>
      renderToSvgString(
        scene({ children: [grid('paper', { bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })] }),
        {
          adapters: [GridInputEmbedAdapter],
          compile: { composites: [GridDefinition] },
        },
      ),
    ).not.toThrow();
    expect(() =>
      renderToSvgString(
        scene({ children: [grid('paper', { bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })] }),
        {
          adapters: [GridInputEmbedAdapter],
          compile: { composites: [{ ...GridDefinition }] },
        },
      ),
    ).toThrow(/definition conflict.*standard\.grid/i);
  });
});
