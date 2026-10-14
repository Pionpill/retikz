import type { CompositeCompileContext, CompositeContributionResult, LayoutProposal } from '@retikz/core';

import { RetikzLayoutError, RetikzLayoutErrorCode } from '../../errors';
import type { ResolveLayoutAxisSizeInput } from './geometry';
import { resolveLayoutAxisSize } from './geometry';

/** 只查询当前 solver 需要的单轴槽位贡献 */
export const measureLayoutAxis = (
  context: CompositeCompileContext,
  sourceIndex: number,
  proposal: LayoutProposal,
  axis: 'x' | 'y',
): number => {
  const probe = context.measureChild(context.sourceChild(['children', sourceIndex, 'child']), proposal, axis);
  if (probe.kind === 'failed') return context.raise(probe.failure);
  if (probe.result.axis === 'x') return probe.result.width;
  if (probe.result.axis === 'y') return probe.result.height;
  throw new RetikzLayoutError({
    code: RetikzLayoutErrorCode.GeometryInvalid,
    message: 'Expected a single-axis contribution',
    details: {},
  });
};

/** 只在尺寸与内容贡献无关时调用已有尺寸求解器 */
export const resolveKnownLayoutAxisSize = (
  input: Omit<ResolveLayoutAxisSizeInput, 'minimumContribution' | 'naturalContribution'>,
): number | undefined => {
  if (input.policy.kind === 'content' && input.proposal.kind !== 'exact') return undefined;
  return resolveLayoutAxisSize({ ...input, minimumContribution: 0, naturalContribution: 0 }).allocationSize;
};

/** 只返回所需的已求得 allocation 轴 */
export const createLayoutContributionResult = (
  context: CompositeCompileContext,
  width: number,
  height: number,
): CompositeContributionResult => ({
  kind: 'contribution',
  contribution:
    context.evaluation.kind === 'contribution' && context.evaluation.axis === 'x'
      ? { axis: 'x', width }
      : context.evaluation.kind === 'contribution' && context.evaluation.axis === 'y'
        ? { axis: 'y', height }
        : { axis: 'both', width, height },
});

/** 尺寸规则已足够决定请求时，在同一 pipeline 内提前结束 */
export const resolveKnownLayoutContribution = (
  context: CompositeCompileContext,
  size: { x: ResolveLayoutAxisSizeInput['policy']; y: ResolveLayoutAxisSizeInput['policy'] },
): CompositeContributionResult | undefined => {
  if (context.evaluation.kind !== 'contribution') return undefined;
  const axis = context.evaluation.axis;
  const width =
    axis === 'y' ? undefined : resolveKnownLayoutAxisSize({ axis: 'x', policy: size.x, proposal: context.proposal.x });
  const height =
    axis === 'x' ? undefined : resolveKnownLayoutAxisSize({ axis: 'y', policy: size.y, proposal: context.proposal.y });
  if (axis === 'x' && width !== undefined) return { kind: 'contribution', contribution: { axis, width } };
  if (axis === 'y' && height !== undefined) return { kind: 'contribution', contribution: { axis, height } };
  if (axis === 'both' && width !== undefined && height !== undefined)
    return { kind: 'contribution', contribution: { axis, width, height } };
  return undefined;
};
