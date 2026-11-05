import { describe, expect, it } from 'vitest';

import {
  calculateLayoutFromBounds,
  LayoutAlignmentGuideDimension,
  BuiltinLayoutAlignmentGuideName,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  naturalLayoutProposal,
} from '../../../../core/src';
import { createRound } from '../../../../core/src/compile/scene';

describe('布局公共 API', () => {
  it('从公开入口计算包含 padding 的布局边界', () => {
    const layout = calculateLayoutFromBounds({ minX: 0, minY: 0, maxX: 10, maxY: 20 }, 5, createRound(2));

    expect(layout).toEqual({ x: -5, y: -5, width: 20, height: 30 });
  });

  it('从包根导出冻结的布局建议、探测和引导常量', () => {
    expect(LayoutAxisProposalKind).toEqual({
      Intrinsic: 'intrinsic',
      Range: 'range',
      Exact: 'exact',
    });
    expect(LayoutIntrinsicMode).toEqual({ Minimum: 'minimum', Natural: 'natural' });
    expect(LayoutChildProbeKind).toEqual({ Resolved: 'resolved', Failed: 'failed' });
    expect(BuiltinLayoutAlignmentGuideName).toEqual({
      FirstBaseline: 'first-baseline',
      LastBaseline: 'last-baseline',
    });
    expect(LayoutAlignmentGuideDimension).toEqual({ X: 'x', Y: 'y' });
    expect(naturalLayoutProposal).toEqual({
      x: { kind: 'intrinsic', mode: 'natural' },
      y: { kind: 'intrinsic', mode: 'natural' },
    });
    expect(Object.isFrozen(naturalLayoutProposal)).toBe(true);
    expect(Object.isFrozen(naturalLayoutProposal.x)).toBe(true);
    expect(Object.isFrozen(naturalLayoutProposal.y)).toBe(true);
    expect(Reflect.set(naturalLayoutProposal.x, 'mode', 'minimum')).toBe(false);
  });
});
