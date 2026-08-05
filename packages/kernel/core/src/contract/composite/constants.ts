import type { LayoutProposal } from './types';

/** 单轴布局提案的判别值 */
export const LayoutAxisProposalKind = {
  /** 请求子节点的内在尺寸贡献 */
  Intrinsic: 'intrinsic',
  /** 请求子节点在指定尺寸范围内布局 */
  Range: 'range',
  /** 要求子节点使用固定尺寸 */
  Exact: 'exact',
} as const;

/** 内在尺寸提案的查询模式 */
export const LayoutIntrinsicMode = {
  /** 最小合法尺寸贡献 */
  Minimum: 'minimum',
  /** 自然尺寸贡献 */
  Natural: 'natural',
} as const;

/** 对齐参考线所属的一维坐标轴 */
export const LayoutAlignmentGuideDimension = {
  /** 水平轴 */
  X: 'x',
  /** 垂直轴 */
  Y: 'y',
} as const;

/** Core 提供的稳定对齐参考线名称 */
export const LayoutAlignmentGuideName = {
  /** 首行基线 */
  FirstBaseline: 'first-baseline',
  /** 末行基线 */
  LastBaseline: 'last-baseline',
} as const;

/** 子节点探测结果的判别值 */
export const LayoutChildProbeKind = {
  /** 探测成功 */
  Resolved: 'resolved',
  /** 探测失败 */
  Failed: 'failed',
} as const;

/** 根布局感知复合节点使用的深冻结自然尺寸提案 */
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
