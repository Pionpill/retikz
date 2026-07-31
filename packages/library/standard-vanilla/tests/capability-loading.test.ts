import { createGrid, createStandardBundle, GridModule } from '@retikz/standard';
import {
  axes,
  AxesVanillaAdapter,
  FlexLayoutVanillaAdapter,
  frame,
  FrameVanillaAdapter,
  grid,
  GridLayoutVanillaAdapter,
  GridVanillaAdapter,
  OverlayLayoutVanillaAdapter,
  StandardVanillaAdapters,
} from '@retikz/standard-vanilla';
import { normalizeFigureSpec, renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

const figure = {
  type: 'figure' as const,
  version: 1 as const,
  children: [
    grid('paper', { bounds: { min: [0, 0], max: [20, 20] }, spacing: 10 }),
    axes('plane', { extent: { x: 20, y: 20 } }),
    frame('contract', { children: [{ type: 'node', position: [0, 0], text: 'Contract' }] }),
  ],
};

describe('Standard Vanilla capability loading', () => {
  it('provides the current adapter catalog once in stable frozen order', () => {
    expect(StandardVanillaAdapters).toEqual([
      GridVanillaAdapter,
      AxesVanillaAdapter,
      FrameVanillaAdapter,
      FlexLayoutVanillaAdapter,
      GridLayoutVanillaAdapter,
      OverlayLayoutVanillaAdapter,
    ]);
    expect(Object.isFrozen(StandardVanillaAdapters)).toBe(true);
    expect(Object.isFrozen(GridVanillaAdapter)).toBe(false);
  });

  it('normalizes all current embeds with the all-adapters preset', () => {
    const normalized = normalizeFigureSpec(figure, { adapters: StandardVanillaAdapters });

    expect(normalized.composites).toHaveLength(3);
    expect(normalized.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame']);
  });

  it('keeps partial adapter selection explicit', () => {
    expect(() => normalizeFigureSpec(figure, { adapters: [GridVanillaAdapter, FrameVanillaAdapter] })).toThrow(
      /kind "standard\.axes" but no adapter was provided/i,
    );
  });

  it('compiles direct Standard IR with a bundle and no adapters', () => {
    const ir = {
      type: 'scene' as const,
      version: 1 as const,
      children: [createGrid({ bounds: { min: [0, 0], max: [20, 20] }, spacing: 10 })],
    };

    expect(() => renderToSvgString(ir, { compile: createStandardBundle([GridModule]).compile })).not.toThrow();
  });

  it('leaves duplicate adapter and bundle registration fail-loud', () => {
    expect(() =>
      renderToSvgString(
        {
          type: 'figure',
          version: 1,
          children: [grid('paper', { bounds: { min: [0, 0], max: [20, 20] }, spacing: 10 })],
        },
        {
          adapters: [GridVanillaAdapter],
          compile: createStandardBundle([GridModule]).compile,
        },
      ),
    ).toThrow(/duplicate composite registration.*standard\.grid/i);
  });
});
