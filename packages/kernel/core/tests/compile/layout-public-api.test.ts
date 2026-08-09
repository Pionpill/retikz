import type { AssertEqual } from '@retikz/foundation';
import type { BoundsRect } from '@retikz/math';

import { describe, expect, it } from 'vitest';

import type { Scene } from '../../src';

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
  it('exports computeLayout and uses BoundsRect for Scene.layout', () => {
    const layout = computeLayout(
      [
        [0, 0],
        [10, 20],
      ],
      5,
      createRound(2),
    );
    const _assertLayout: AssertEqual<Scene['layout'], BoundsRect> = true;
    void _assertLayout;

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
