import type { ScenePrimitive } from '../../contract';
import { pushAllocation } from './allocation';
import type { TreeCompileFrame } from './frame';
import type { PathPlaceholder } from './path';
import type { SubtreeOutputContribution } from './types';

/** compile 内部 sink 元素类型：真 Scene primitive 或编译期占位 */
export type InternalScenePrimitive = ScenePrimitive | PathPlaceholder;

/** zIndex 只作为编译期旁路信息，不写入 Scene primitive */
export type PrimitiveZIndexTable = WeakMap<ScenePrimitive, number>;

/** 记录 primitive 的显式 zIndex */
export const recordPrimitiveZIndex = (
  table: PrimitiveZIndexTable,
  prim: ScenePrimitive,
  zIndex: number | undefined,
): void => {
  if (zIndex !== undefined) table.set(prim, zIndex);
};

/** 按 zIndex 升序稳定排序，同 zIndex 保持原顺序 */
export const stableSortByZIndex = (arr: Array<ScenePrimitive>, table: PrimitiveZIndexTable): Array<ScenePrimitive> => {
  return arr.sort((a, b) => (table.get(a) ?? 0) - (table.get(b) ?? 0));
};

/** 开发诊断：递归找出残留占位的 index 路径 */
export const collectPlaceholderLocators = (
  prims: ReadonlyArray<InternalScenePrimitive>,
  prefix = 'primitives',
): Array<string> => {
  const locators: Array<string> = [];
  prims.forEach((prim, idx) => {
    if (prim.type === 'path-placeholder') {
      locators.push(`${prefix}[${idx}]`);
    } else if (prim.type === 'group') {
      locators.push(...collectPlaceholderLocators(prim.children, `${prefix}[${idx}].children`));
    }
  });

  return locators;
};

/** 接受已重映射的子树输出，统一维护当前帧的收集容器 */
export const acceptTreeContribution = (
  output: TreeOutputState,
  frame: TreeCompileFrame,
  contribution: SubtreeOutputContribution,
): void => {
  for (const [index, primitive] of contribution.primitives.entries()) {
    frame.primitiveSink.push(primitive);
    recordPrimitiveZIndex(output.zIndexOf, primitive, contribution.primitiveZIndices[index]);
  }
  frame.layoutSink.push(...contribution.layouts);
  frame.publicationSink.push(...contribution.publications);
  frame.boundsSink.push(...contribution.bounds);
  for (const allocation of contribution.allocations) {
    pushAllocation(frame.allocationSink, allocation.boundsPoints, frame.allocationBoundary);
  }
  frame.artifactSink.push(...contribution.artifacts);
};

/** 当前子树输出的排序记录与尚未回填的路径数 */
export type TreeOutputState = {
  /** 本次执行的图元排序旁路表 */
  zIndexOf: PrimitiveZIndexTable;
  /** 本次执行尚未回填的占位数量 */
  pendingPathCount: number;
};
