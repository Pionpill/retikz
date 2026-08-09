import { LayoutAxisProposalKind, LayoutIntrinsicMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  alignAllocationInSlot,
  compileFlexLayout,
  contentRectOf,
  createLayoutArtifactContainer,
  createLayoutArtifactItem,
  layoutClipOf,
  normalizeLayoutSpacing,
  resolveLayoutAxisSize,
  unionLayoutArtifactRects,
} from '../../src/layout';

describe('Standard public layout composition contract', () => {
  it('exposes the canonical compiler and atomic layout helpers', () => {
    expect(compileFlexLayout).toBeTypeOf('function');
    expect(normalizeLayoutSpacing).toBeTypeOf('function');
    expect(contentRectOf).toBeTypeOf('function');
    expect(resolveLayoutAxisSize).toBeTypeOf('function');
    expect(alignAllocationInSlot).toBeTypeOf('function');
    expect(layoutClipOf).toBeTypeOf('function');
    expect(createLayoutArtifactItem).toBeTypeOf('function');
    expect(createLayoutArtifactContainer).toBeTypeOf('function');
    expect(unionLayoutArtifactRects).toBeTypeOf('function');
  });

  it('keeps the canonical geometry and failure semantics', () => {
    expect(normalizeLayoutSpacing({ default: 1, x: 2, y: 3, left: 4 })).toEqual({
      top: 3,
      right: 2,
      bottom: 3,
      left: 4,
    });
    expect(contentRectOf({ x: 0, y: 0, width: 10, height: 6 }, { top: 4, right: 8, bottom: 4, left: 7 })).toEqual({
      x: 7,
      y: 4,
      width: 0,
      height: 0,
    });
    expect(
      alignAllocationInSlot(
        { x: 100, y: 20, width: 40, height: 30 },
        { x: -5, y: 3, width: 20, height: 10 },
        'x',
        'center',
      ),
    ).toBe(115);
    expect(layoutClipOf({ width: 0, height: 10 })).toMatchObject({ kind: 'path' });
    expect(unionLayoutArtifactRects([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(() =>
      resolveLayoutAxisSize({
        axis: 'x',
        policy: { kind: 'fill' },
        proposal: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        minimumContribution: 0,
        naturalContribution: 0,
      }),
    ).toThrow('Standard layout fill requires a finite parent allocation on x');
  });
});
