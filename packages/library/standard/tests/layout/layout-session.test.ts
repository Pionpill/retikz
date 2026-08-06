import { LayoutAxisProposalKind, LayoutIntrinsicMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { exactLayoutProposal, intrinsicLayoutProposal } from '../../src/composites/layout/internal/layout-session';

describe('layout child session', () => {
  it('creates the canonical minimum and natural intrinsic proposals', () => {
    expect(intrinsicLayoutProposal('minimum')).toEqual({
      x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
      y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
    });
    expect(intrinsicLayoutProposal('natural')).toEqual({
      x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
    });
  });

  it('creates an exact proposal from the final structural slot', () => {
    expect(
      exactLayoutProposal({
        x: 4,
        y: 8,
        width: 20,
        height: 10,
      }),
    ).toEqual({
      x: { kind: LayoutAxisProposalKind.Exact, value: 20 },
      y: { kind: LayoutAxisProposalKind.Exact, value: 10 },
    });
  });
});
