import type { CompileOccurrenceLocator, LayoutContribution, LayoutMeasurementAxis, LayoutProposal } from '@retikz/core';
import { canonicalizeBoundsRect, mergeLayoutBounds, createCompositeContractError } from '@retikz/core';
import type { BoundsRect } from '@retikz/math';
import { boundsToRect } from '@retikz/math';

import { formatCompileOccurrence } from '../../shared';
import type { SubtreeCompilation } from '../subtree';
import { resolveLayoutAxisSlotSize } from './proposal';

/** 从真实边界提取指定轴，不补齐未查询的尺寸 */
export const contributionOfBounds = (axis: LayoutMeasurementAxis, bounds: Readonly<BoundsRect>): LayoutContribution =>
  axis === 'x'
    ? { axis, width: bounds.width }
    : axis === 'y'
      ? { axis, height: bounds.height }
      : { axis, width: bounds.width, height: bounds.height };

/** 共享既有单轴槽位语义，隔离并冻结可缓存贡献 */
export const projectContribution = (contribution: LayoutContribution, proposal: LayoutProposal): LayoutContribution => {
  if (contribution.axis === 'x')
    return Object.freeze({ axis: 'x', width: resolveLayoutAxisSlotSize(contribution.width, proposal.x) });
  if (contribution.axis === 'y')
    return Object.freeze({ axis: 'y', height: resolveLayoutAxisSlotSize(contribution.height, proposal.y) });
  return Object.freeze({
    axis: 'both',
    width: resolveLayoutAxisSlotSize(contribution.width, proposal.x),
    height: resolveLayoutAxisSlotSize(contribution.height, proposal.y),
  });
};

/** 汇总对父布局可见的分配贡献；空内容保留零尺寸边界 */
export const boundsRectOf = (result: SubtreeCompilation): Readonly<BoundsRect> => {
  let allocation: SubtreeCompilation['visualBounds'];
  for (const contribution of result.layout.allocations) {
    if (contribution.skipAllocation !== true) allocation = mergeLayoutBounds(allocation, contribution.boundsPoints);
  }
  return canonicalizeBoundsRect(
    allocation === undefined ? { x: 0, y: 0, width: 0, height: 0 } : boundsToRect(allocation),
  );
};

/** 校验并隔离组件声明的布局分配边界 */
export const snapshotAllocationBounds = (
  bounds: unknown,
  compositeKey: string,
  occurrence: CompileOccurrenceLocator,
): Readonly<BoundsRect> => {
  if (bounds === null || typeof bounds !== 'object' || Array.isArray(bounds)) {
    throw createCompositeContractError(
      `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} returned an invalid allocationBounds.`,
    );
  }

  const input = bounds as Record<string, unknown>;
  const unsupportedKeys = Object.keys(input).filter(key => !['x', 'y', 'width', 'height'].includes(key));
  const [x, y, width, height] = [input.x, input.y, input.width, input.height];
  if (
    unsupportedKeys.length > 0 ||
    ![x, y, width, height].every(value => typeof value === 'number' && Number.isFinite(value)) ||
    (width as number) < 0 ||
    (height as number) < 0
  ) {
    throw createCompositeContractError(
      `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} returned invalid allocationBounds; x/y must be finite and width/height must be finite non-negative numbers.`,
    );
  }

  const right = (x as number) + (width as number);
  const bottom = (y as number) + (height as number);
  if (!Number.isFinite(right) || !Number.isFinite(bottom)) {
    throw createCompositeContractError(
      `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} returned invalid allocationBounds; derived edges must remain finite.`,
    );
  }

  return Object.freeze({
    x: Object.is(x, -0) ? 0 : (x as number),
    y: Object.is(y, -0) ? 0 : (y as number),
    width: Object.is(width, -0) ? 0 : (width as number),
    height: Object.is(height, -0) ? 0 : (height as number),
  });
};
