import { createGrid, GridDefinition, LegendContentKind } from '@retikz/standard';
import {
  axes,
  AxesVanillaAdapter,
  CalloutVanillaAdapter,
  ConnectorVanillaAdapter,
  DecisionVanillaAdapter,
  FlexLayoutVanillaAdapter,
  frame,
  FrameVanillaAdapter,
  grid,
  GridLayoutVanillaAdapter,
  GridVanillaAdapter,
  JunctionVanillaAdapter,
  legend,
  LegendVanillaAdapter,
  LogicFrameVanillaAdapter,
  OverlayLayoutVanillaAdapter,
  StageVanillaAdapter,
  StandardVanillaAdapters,
  TerminalVanillaAdapter,
} from '@retikz/standard-vanilla';
import { normalizeFigureSpec, renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

const figure = {
  type: 'figure' as const,
  version: 1 as const,
  children: [
    grid('paper', { bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } }),
    axes('plane', { x: { extent: 20 }, y: { extent: 20 } }),
    frame('contract', { children: [{ type: 'node', position: [0, 0], text: 'Contract' }] }),
    legend('status', {
      content: {
        kind: LegendContentKind.Items,
        items: [{ key: 'node', sample: { type: 'node', position: [0, 0], text: 'N' } }],
      },
    }),
  ],
};

describe('Standard Vanilla definition loading', () => {
  it('provides the current adapter catalog once in stable frozen order', () => {
    expect(StandardVanillaAdapters).toEqual([
      GridVanillaAdapter,
      AxesVanillaAdapter,
      FrameVanillaAdapter,
      FlexLayoutVanillaAdapter,
      GridLayoutVanillaAdapter,
      OverlayLayoutVanillaAdapter,
      LegendVanillaAdapter,
      LogicFrameVanillaAdapter,
      TerminalVanillaAdapter,
      StageVanillaAdapter,
      DecisionVanillaAdapter,
      JunctionVanillaAdapter,
      ConnectorVanillaAdapter,
      CalloutVanillaAdapter,
    ]);
    expect(Object.isFrozen(StandardVanillaAdapters)).toBe(true);
    expect(Object.isFrozen(GridVanillaAdapter)).toBe(false);
  });

  it('normalizes all current embeds with the all-adapters preset', () => {
    const normalized = normalizeFigureSpec(figure, { adapters: StandardVanillaAdapters });

    expect(normalized.composites).toHaveLength(4);
    expect(normalized.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame', 'legend']);
  });

  it('keeps partial adapter selection explicit', () => {
    expect(() => normalizeFigureSpec(figure, { adapters: [GridVanillaAdapter, FrameVanillaAdapter] })).toThrow(
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

  it('leaves duplicate adapter and explicit definition registration fail-loud', () => {
    expect(() =>
      renderToSvgString(
        {
          type: 'figure',
          version: 1,
          children: [grid('paper', { bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })],
        },
        {
          adapters: [GridVanillaAdapter],
          compile: { composites: [GridDefinition] },
        },
      ),
    ).toThrow(/duplicate composite registration.*standard\.grid/i);
  });
});
