import { LayoutAxisProposalKind, LayoutIntrinsicMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { exactLayoutProposal, intrinsicLayoutProposal } from '../../src/composites/internal/layout-session';

describe('布局子会话', () => {
  it('创建规范的最小和自然的内在提案', () => {
    expect(intrinsicLayoutProposal('minimum')).toEqual({
      x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
      y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
    });
    expect(intrinsicLayoutProposal('natural')).toEqual({
      x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
    });
  });

  it('根据最终的结构槽创建精确的提案', () => {
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
