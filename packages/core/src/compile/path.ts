import { rect as rectOps } from '../geometry/rect';
import type { IRPath, IRPosition, IRTarget } from '../ir';
import type { ScenePrimitive } from '../primitive';
import { type NodeLayout, attachRectOf } from './node';
import { resolvePosition } from './position';

/**
 * 求一个 step.to 的"参考点"——给邻居 step 算节点边界方向用：
 * - string（节点 ref） → 节点中心
 * - Position / PolarPosition → 解析后的笛卡尔
 * 解析失败返回 null（与 resolvePosition 一致）。
 */
const refPointOfTarget = (
  target: IRTarget,
  nodeIndex: Map<string, NodeLayout>,
): IRPosition | null => resolvePosition(target, nodeIndex);

/**
 * 把 IR Path 翻译为单个 PathPrim。
 * 算法：
 * 1. 第一遍：把每个 step.to 解析为"参考点"（节点中心 / 直接坐标 / 极坐标解算后），
 *    用于给邻居 step 算节点边界点的方向；
 * 2. 第二遍：算每个 step 的实际终点——节点引用调用 boundaryPoint 贴 attachRect；
 *    其他形态直接用解析后的笛卡尔。
 * 3. 把点序列写成 SVG path d 字符串。
 *
 * 引用未定义节点时返回 null（path 整体跳过）。
 */
export const emitPathPrimitive = (
  path: IRPath,
  nodeIndex: Map<string, NodeLayout>,
  round: (n: number) => number,
): { primitive: ScenePrimitive; points: Array<IRPosition> } | null => {
  const steps = path.children;
  if (steps.length < 2) return null;

  const refPoints: Array<IRPosition | null> = steps.map(s =>
    refPointOfTarget(s.to, nodeIndex),
  );

  const points: Array<IRPosition> = [];
  for (let i = 0; i < steps.length; i++) {
    const target = steps[i].to;
    if (typeof target === 'string') {
      const node = nodeIndex.get(target);
      if (!node) return null; // 引用未定义节点
      const neighbor =
        i > 0 ? refPoints[i - 1] : i + 1 < steps.length ? refPoints[i + 1] : null;
      if (!neighbor) {
        points.push([node.rect.x, node.rect.y]);
      } else {
        // 用 attachRect（视觉 rect 外扩 margin），让 path 在 border 外停 margin
        points.push(rectOps.boundaryPoint(attachRectOf(node), neighbor));
      }
    } else {
      // Position 或 PolarPosition
      const resolved = resolvePosition(target, nodeIndex);
      if (!resolved) return null;
      points.push(resolved);
    }
  }

  // 写 d 字符串时按 precision 四舍五入
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p[0])} ${round(p[1])}`)
    .join(' ');

  const primitive: ScenePrimitive = {
    type: 'path',
    d,
    stroke: path.stroke ?? 'currentColor',
    strokeWidth: path.strokeWidth ?? 1,
    fill: 'none',
    strokeDasharray: path.strokeDasharray,
  };

  return { primitive, points };
};
