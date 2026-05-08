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
 * 折角中间点：基于"参考点"（节点中心或直接坐标）算直角拐点。
 * 用 ref 点而非 boundary 点——TikZ 语义是 corner 与节点中心轴对齐：
 * `-|` corner = (next.x, prev.y)；`|-` corner = (prev.x, next.y)。
 * 两侧端点再各自向 corner 方向贴 boundary（见 emitPathPrimitive）。
 */
const cornerOf = (
  prev: IRPosition,
  curr: IRPosition,
  via: '-|' | '|-',
): IRPosition =>
  via === '-|' ? [curr[0], prev[1]] : [prev[0], curr[1]];

/**
 * 把 IR Path 翻译为单个 PathPrim。
 * 算法：
 * 1. refPoints[i]：把每个 step.to 解析为参考点（节点中心 / 直接坐标 / 极坐标解算后）。
 * 2. corners[i]：fold step 的直角拐点，由 refPoints[i-1] / refPoints[i] 配合 via 算出；
 *    用中心而非 boundary 点，让水平/垂直腿与节点几何中心对齐（TikZ 语义）。
 * 3. endpoints[i]：节点 ref 走 boundaryPoint(attachRect, approach)；approach 方向：
 *    - 自身是 fold：朝向 corners[i]
 *    - 下一段是 fold：朝向 corners[i+1]（出腿沿 corner 走）
 *    - 否则：朝向前一个 refPoint（普通 line 行为）
 * 4. 把端点 + corner 序列写成 SVG path d。
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
    s.kind === 'cycle' ? null : refPointOfTarget(s.to, nodeIndex),
  );

  // fold step 的拐点；非 fold 或 ref 缺失为 null
  const corners: Array<IRPosition | null> = steps.map((s, i) => {
    if (s.kind !== 'step') return null;
    if (i === 0) return null;
    const prev = refPoints[i - 1];
    const curr = refPoints[i];
    if (!prev || !curr) return null;
    return cornerOf(prev, curr, s.via);
  });

  /** 取 endpoint i 的"贴边方向参考点"——决定 boundaryPoint 朝哪边切 */
  const approachOf = (i: number): IRPosition | null => {
    if (steps[i].kind === 'step' && corners[i]) return corners[i];
    if (i + 1 < steps.length && steps[i + 1].kind === 'step' && corners[i + 1]) {
      return corners[i + 1];
    }
    if (i > 0) return refPoints[i - 1];
    if (i + 1 < steps.length) return refPoints[i + 1];
    return null;
  };

  const endpoints: Array<IRPosition | null> = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.kind === 'cycle') {
      endpoints.push(null);
      continue;
    }
    const target = step.to;
    if (typeof target === 'string') {
      const node = nodeIndex.get(target);
      if (!node) return null; // 引用未定义节点
      const approach = approachOf(i);
      if (!approach) {
        endpoints.push([node.rect.x, node.rect.y]);
      } else {
        // 用 attachRect（视觉 rect 外扩 margin），让 path 在 border 外停 margin
        endpoints.push(rectOps.boundaryPoint(attachRectOf(node), approach));
      }
    } else {
      // Position 或 PolarPosition
      const resolved = resolvePosition(target, nodeIndex);
      if (!resolved) return null;
      endpoints.push(resolved);
    }
  }

  // 顺着 step kind 把 endpoints 翻成"实际绘制点序列"——折角在中间多塞一个 corner，
  // cycle 不增加点，只在 d 字符串末尾追加一个 'Z' 标记。
  const points: Array<IRPosition> = [];
  const tokens: Array<string> = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.kind === 'cycle') {
      tokens.push('Z');
      continue;
    }
    const ep = endpoints[i];
    if (!ep) return null; // 不应发生：非 cycle step 的 endpoint 必有
    if (i === 0) {
      points.push(ep);
      tokens.push(`M ${round(ep[0])} ${round(ep[1])}`);
      continue;
    }
    if (step.kind === 'step') {
      const corner = corners[i];
      if (corner) {
        points.push(corner);
        tokens.push(`L ${round(corner[0])} ${round(corner[1])}`);
      }
      points.push(ep);
      tokens.push(`L ${round(ep[0])} ${round(ep[1])}`);
      continue;
    }
    points.push(ep);
    tokens.push(`${step.kind === 'move' ? 'M' : 'L'} ${round(ep[0])} ${round(ep[1])}`);
  }

  const d = tokens.join(' ');

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
