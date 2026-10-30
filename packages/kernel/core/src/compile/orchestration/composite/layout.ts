import type { BoundsRect } from '@retikz/math';
import { boundsToRect } from '@retikz/math';

import type {
  CompileOccurrenceLocator,
  CompositeCompileScopeProps,
  LayoutContribution,
  LayoutMeasurementAxis,
  LayoutProposal,
} from '../../../contract';
import { CompileExpansionKind } from '../../../contract';
import { createCompositeContractError } from '../../../resolve/diagnostics';
import type { IRPosition } from '../../../schemas';
import { formatCompileOccurrence } from '../../artifact';
import { canonicalizeBoundsRect, collectLayoutBounds } from '../../scene';
import { resolveLayoutAxisSlotSize } from '../layout-proposal';
import type { ScopeChild, TraversalFrame, TraversalResult } from '../types';

/** 按有效默认配置判断 replay 是否需要重新物化 */
export const replayStyleFingerprint = (scopeDefaults: TraversalFrame['scopeDefaults']): string =>
  JSON.stringify(scopeDefaults);

/** 对 resolved Theme 做 compile-local 稳定比较 */
export const replayThemeFingerprint = (theme: TraversalFrame['theme']): string => JSON.stringify(theme);

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
export const boundsRectOf = (result: TraversalResult): Readonly<BoundsRect> => {
  let allocation: TraversalResult['layoutBounds'];
  for (const contribution of result.allocations) {
    if (contribution.allocationBoundary === undefined)
      allocation = collectLayoutBounds(allocation, contribution.boundsPoints);
  }
  return canonicalizeBoundsRect(
    allocation === undefined ? { x: 0, y: 0, width: 0, height: 0 } : boundsToRect(allocation),
  );
};

/** 将分配矩形转换为四角贡献点 */
export const allocationPointsOf = (bounds: Readonly<BoundsRect>): Array<IRPosition> => {
  return [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ];
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

/** 将试编译内的出现位置重定位到最终重放位置，保留内部展开后缀 */
export const replayOccurrence = (
  parent: CompileOccurrenceLocator,
  index: number,
  origin: CompileOccurrenceLocator,
  child: CompileOccurrenceLocator,
): CompileOccurrenceLocator => {
  return {
    sourcePath: parent.sourcePath,
    expansionPath: [
      ...parent.expansionPath,
      { kind: CompileExpansionKind.Replay, index },
      ...child.expansionPath.slice(origin.expansionPath.length),
    ],
  };
};

/** 将组件生成的 Scope 属性转换为普通作用域声明 */
export const runtimeScopeChildOf = (props: CompositeCompileScopeProps): ScopeChild => {
  const { transforms, animations, ...rest } = props;
  return {
    type: 'scope',
    ...rest,
    ...(transforms === undefined ? {} : { transforms: [...transforms] }),
    ...(animations === undefined ? {} : { animations: [...animations] }),
    children: [],
  };
};
