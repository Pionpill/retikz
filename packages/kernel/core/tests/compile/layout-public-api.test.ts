import { describe, expect, it } from 'vitest';

import {
  computeLayout,
  LayoutAlignmentGuideDimension,
  LayoutAlignmentGuideName,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  NaturalLayoutProposal,
} from '../../src';
import { createRound } from '../../src/compile/scene';

describe('layout public API', () => {
  it('从公开入口计算包含 padding 的布局边界', () => {
    const layout = computeLayout(
      [
        [0, 0],
        [10, 20],
      ],
      5,
      createRound(2),
    );
    expect(layout).toEqual({ x: -5, y: -5, width: 20, height: 30 });
  });

  it('exports the frozen layout proposal, probe, and guide constants from the package root', () => {
    expect(LayoutAxisProposalKind).toEqual({
      Intrinsic: 'intrinsic',
      Range: 'range',
      Exact: 'exact',
    });
    expect(LayoutIntrinsicMode).toEqual({ Minimum: 'minimum', Natural: 'natural' });
    expect(LayoutChildProbeKind).toEqual({ Resolved: 'resolved', Failed: 'failed' });
    expect(LayoutAlignmentGuideName).toEqual({
      FirstBaseline: 'first-baseline',
      LastBaseline: 'last-baseline',
    });
    expect(LayoutAlignmentGuideDimension).toEqual({ X: 'x', Y: 'y' });
    expect(NaturalLayoutProposal).toEqual({
      x: { kind: 'intrinsic', mode: 'natural' },
      y: { kind: 'intrinsic', mode: 'natural' },
    });
    expect(Object.isFrozen(NaturalLayoutProposal)).toBe(true);
    expect(Object.isFrozen(NaturalLayoutProposal.x)).toBe(true);
    expect(Object.isFrozen(NaturalLayoutProposal.y)).toBe(true);
    expect(Reflect.set(NaturalLayoutProposal.x, 'mode', 'minimum')).toBe(false);
  });
});
