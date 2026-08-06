import { LayoutAxisProposalKind, LayoutIntrinsicMode, PathClipSchema, RectClipSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { LayoutAlignment, LayoutAxisSizeKind } from '../../src';
import {
  alignAllocationInSlot,
  contentRectOf,
  layoutClipOf,
  normalizeLayoutSpacing,
  outsetLayoutRect,
  positionedLayoutSlotOf,
  resolveLayoutAxisSize,
} from '../../src/composites/layout/internal';

describe('shared layout size resolution', () => {
  it('selects minimum or natural content contribution and clamps through author and parent ranges', () => {
    const common = {
      axis: 'x' as const,
      policy: { kind: LayoutAxisSizeKind.Content, min: 20, max: 80 } as const,
      minimumContribution: 10,
      naturalContribution: 100,
    };

    expect(
      resolveLayoutAxisSize({
        ...common,
        proposal: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
      }),
    ).toEqual({ allocationSize: 20 });
    expect(
      resolveLayoutAxisSize({
        ...common,
        proposal: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      }),
    ).toEqual({ allocationSize: 80 });
    expect(
      resolveLayoutAxisSize({
        ...common,
        proposal: { kind: LayoutAxisProposalKind.Range, min: 30, max: 60 },
      }),
    ).toEqual({ allocationSize: 60, finiteAvailable: 60 });
    expect(
      resolveLayoutAxisSize({
        ...common,
        proposal: { kind: LayoutAxisProposalKind.Exact, value: 40 },
      }),
    ).toEqual({ allocationSize: 40, finiteAvailable: 40 });
  });

  it('keeps an authored minimum when no authored maximum exists', () => {
    expect(
      resolveLayoutAxisSize({
        axis: 'x',
        policy: { kind: LayoutAxisSizeKind.Content, min: 20 },
        proposal: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        minimumContribution: 5,
        naturalContribution: 10,
      }),
    ).toEqual({ allocationSize: 20 });
    expect(
      resolveLayoutAxisSize({
        axis: 'y',
        policy: { kind: LayoutAxisSizeKind.Fill, min: 20 },
        proposal: { kind: LayoutAxisProposalKind.Exact, value: 10 },
        minimumContribution: 0,
        naturalContribution: 0,
      }),
    ).toEqual({ allocationSize: 20, finiteAvailable: 10 });
  });

  it('preserves authored fixed allocation when the parent slot conflicts', () => {
    expect(
      resolveLayoutAxisSize({
        axis: 'y',
        policy: { kind: LayoutAxisSizeKind.Fixed, value: 50 },
        proposal: { kind: LayoutAxisProposalKind.Exact, value: 10 },
        minimumContribution: 0,
        naturalContribution: 0,
      }),
    ).toEqual({ allocationSize: 50, finiteAvailable: 10 });
  });

  it('fills only a finite parent allocation and reports the exact physical axis when unbounded', () => {
    const common = {
      policy: { kind: LayoutAxisSizeKind.Fill, min: 20, max: 80 } as const,
      minimumContribution: 0,
      naturalContribution: 0,
    };

    expect(
      resolveLayoutAxisSize({
        ...common,
        axis: 'x',
        proposal: { kind: LayoutAxisProposalKind.Range, min: 0, max: 100 },
      }),
    ).toEqual({ allocationSize: 80, finiteAvailable: 100 });
    expect(() =>
      resolveLayoutAxisSize({
        ...common,
        axis: 'y',
        proposal: { kind: LayoutAxisProposalKind.Range, min: 0 },
      }),
    ).toThrow('Standard layout fill requires a finite parent allocation on y');
    expect(() =>
      resolveLayoutAxisSize({
        ...common,
        axis: 'x',
        proposal: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      }),
    ).toThrow('Standard layout fill requires a finite parent allocation on x');
  });
});

describe('shared layout Box geometry', () => {
  it('normalizes spacing with side over axis over default precedence', () => {
    expect(normalizeLayoutSpacing({ default: 1, x: 2, y: 3, left: 4 })).toEqual({
      top: 3,
      right: 2,
      bottom: 3,
      left: 4,
    });
    expect(normalizeLayoutSpacing(0)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('keeps authored leading padding when excessive padding collapses content to zero', () => {
    expect(contentRectOf({ x: 0, y: 0, width: 10, height: 6 }, { top: 4, right: 8, bottom: 4, left: 7 })).toEqual({
      x: 7,
      y: 4,
      width: 0,
      height: 0,
    });
  });

  it('outsets a non-zero-origin child rect by item margins', () => {
    expect(outsetLayoutRect({ x: -5, y: 3, width: 20, height: 10 }, { top: 2, right: 4, bottom: 6, left: 8 })).toEqual({
      x: -13,
      y: 1,
      width: 32,
      height: 18,
    });
  });

  it('fails loudly when finite rect and spacing inputs overflow finite geometry', () => {
    expect(() =>
      contentRectOf(
        { x: Number.MAX_VALUE, y: 0, width: 10, height: 10 },
        { top: 0, right: 0, bottom: 0, left: Number.MAX_VALUE },
      ),
    ).toThrow(/finite/i);
    expect(() =>
      outsetLayoutRect(
        { x: 0, y: 0, width: Number.MAX_VALUE, height: 10 },
        { top: 0, right: Number.MAX_VALUE, bottom: 0, left: 0 },
      ),
    ).toThrow(/finite/i);
  });

  it('aligns real allocation bounds inside a parent slot without assuming a zero origin', () => {
    const slot = { x: 100, y: 20, width: 40, height: 30 };
    const child = { x: -5, y: 3, width: 20, height: 10 };

    expect(alignAllocationInSlot(slot, child, 'x', LayoutAlignment.Start)).toBe(105);
    expect(alignAllocationInSlot(slot, child, 'x', LayoutAlignment.Center)).toBe(115);
    expect(alignAllocationInSlot(slot, child, 'x', LayoutAlignment.End)).toBe(125);
    expect(alignAllocationInSlot(slot, child, 'y', LayoutAlignment.End)).toBe(37);
  });

  it('resolves a positioned slot from a content origin, target, anchor, and offset', () => {
    expect(
      positionedLayoutSlotOf({
        content: { x: 10, y: 20, width: 100, height: 50 },
        at: { x: 50, y: 25 },
        anchor: { x: 0.5, y: 1 },
        offset: { x: 2, y: -1 },
        size: { width: 20, height: 10 },
      }),
    ).toEqual({ x: 52, y: 34, width: 20, height: 10 });
  });

  it('uses a rect clip for positive area and a closed degenerate path for zero area', () => {
    const positive = layoutClipOf({ width: 20, height: 10 });
    const zeroWidth = layoutClipOf({ width: 0, height: 10 });

    expect(positive).toEqual({ kind: 'rect', x: 0, y: 0, width: 20, height: 10 });
    expect(RectClipSchema.safeParse(positive).success).toBe(true);
    expect(zeroWidth).toEqual({
      kind: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [0, 0] },
        { kind: 'line', to: [0, 10] },
        { kind: 'line', to: [0, 10] },
        { kind: 'close' },
      ],
    });
    expect(PathClipSchema.safeParse(zeroWidth).success).toBe(true);
  });
});
