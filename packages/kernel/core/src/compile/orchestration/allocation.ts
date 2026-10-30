import type { IRPosition } from '../../schemas';
import type { TraversalFrame } from './types';

/** 选择对当前父布局可见的贡献 */
export const effectiveAllocations = <T extends { allocationBoundary?: object }>(values: ReadonlyArray<T>): Array<T> => {
  return values.filter(value => value.allocationBoundary === undefined);
};

/** 收集属于当前显式分配边界的布局贡献 */
export const pushAllocation = (
  sink: TraversalFrame['allocationSink'],
  boundsPoints: Array<IRPosition>,
  allocationBoundary?: object,
): void => {
  sink.push({ boundsPoints, ...(allocationBoundary === undefined ? {} : { allocationBoundary }) });
};
