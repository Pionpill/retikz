import type { ScenePrimitive } from '@retikz/core';

import type { PATH_PLACEHOLDER } from './constants';

/** 编译期图元数组的元素：Scene primitive 或路径占位项 */
export type InternalScenePrimitive = ScenePrimitive | { type: typeof PATH_PLACEHOLDER };

/** zIndex 只作为编译期旁路信息，不写入 Scene primitive */
type PrimitiveZIndexMap = WeakMap<ScenePrimitive, number>;

/** 按 zIndex 升序稳定排序，同 zIndex 保持原顺序 */
export const stableSortByZIndex = (
  arr: Array<ScenePrimitive>,
  zIndexMap: PrimitiveZIndexMap,
): Array<ScenePrimitive> => {
  return arr.sort((a, b) => (zIndexMap.get(a) ?? 0) - (zIndexMap.get(b) ?? 0));
};

/** 当前子树输出的排序记录与尚未回填的路径数 */
export type TreeOutputState = {
  /** 本次执行的图元排序旁路表 */
  zIndexOf: PrimitiveZIndexMap;
  /** 本次执行尚未回填的占位数量 */
  pendingPathCount: number;
};
