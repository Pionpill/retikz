import type { LayoutProposal } from './types';

/** 单轴 layout proposal 的判别类型 */
export const LayoutAxisProposalKind = {
  Intrinsic: 'intrinsic',
  Range: 'range',
  Exact: 'exact',
} as const;

/** intrinsic proposal 查询的贡献模式 */
export const LayoutIntrinsicMode = {
  Minimum: 'minimum',
  Natural: 'natural',
} as const;

/** alignment guide 所属的一维坐标轴 */
export const LayoutAlignmentGuideDimension = {
  X: 'x',
  Y: 'y',
} as const;

/** Core 提供的稳定 alignment guide 名称 */
export const LayoutAlignmentGuideName = {
  FirstBaseline: 'first-baseline',
  LastBaseline: 'last-baseline',
} as const;

/** child probe 的结果判别类型 */
export const LayoutChildProbeKind = {
  Resolved: 'resolved',
  Failed: 'failed',
} as const;

/** 根 layout-aware Composite 使用的深冻结自然尺寸 proposal */
export const NaturalLayoutProposal = Object.freeze({
  x: Object.freeze({
    kind: LayoutAxisProposalKind.Intrinsic,
    mode: LayoutIntrinsicMode.Natural,
  }),
  y: Object.freeze({
    kind: LayoutAxisProposalKind.Intrinsic,
    mode: LayoutIntrinsicMode.Natural,
  }),
}) satisfies LayoutProposal;
