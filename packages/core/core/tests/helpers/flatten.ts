import type { ScenePrimitive } from '../../src/primitive';

/**
 * 测试 helper：把 Scene primitive 树递归摊平为前序序列（含 GroupPrim 自身与其后代）
 * @description 带文本 / 旋转的 Node emit 成单层 GroupPrim 包裹（无旋转时无 transform），其 shape /
 *   text / label primitive 落在 group.children 内。断言"某节点的 rect / text"时先 flatten 再按 type
 *   过滤，即可穿透包裹层；坐标值不受包裹影响（无 transform group 不改子坐标）。
 */
export const flattenPrims = (
  prims: ReadonlyArray<ScenePrimitive>,
): Array<ScenePrimitive> =>
  prims.flatMap(p => (p.type === 'group' ? [p, ...flattenPrims(p.children)] : [p]));
