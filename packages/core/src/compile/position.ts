import type { AtDirection, IRAtPosition, IRPosition, PolarPosition } from '../ir';
import type { NodeLayout } from './node';

/** 默认相对定位距离（CompileOptions.nodeDistance 未配时使用） */
const DEFAULT_NODE_DISTANCE = 1;

/**
 * 8 方向 → 屏幕坐标系（y 向下）单位向量
 * @description above=视觉上方 (y 减小)；4 对角分量 1/√2 保证斜向与水平/垂直距离等长（对角点落在半径=distance 圆周上）
 */
const DIRECTION_VECTOR: Record<AtDirection, [number, number]> = {
  above: [0, -1],
  below: [0, 1],
  left: [-1, 0],
  right: [1, 0],
  'above-left': [-Math.SQRT1_2, -Math.SQRT1_2],
  'above-right': [Math.SQRT1_2, -Math.SQRT1_2],
  'below-left': [-Math.SQRT1_2, Math.SQRT1_2],
  'below-right': [Math.SQRT1_2, Math.SQRT1_2],
};

/**
 * IR 各种位置形态（笛卡尔/极坐标/相对定位/节点 id）→ 笛卡尔位置
 * @description 极坐标 origin 可递归引用节点 id；相对定位 of 必须引用已定义节点/coordinate；解析失败返回 null。nodeDistance 为容器 prop 注入默认距离，AtPosition 自带 distance 优先
 */
export const resolvePosition = (
  pos: IRPosition | PolarPosition | IRAtPosition | string,
  nodeMap: Map<string, NodeLayout>,
  nodeDistance: number = DEFAULT_NODE_DISTANCE,
): IRPosition | null => {
  if (typeof pos === 'string') {
    const node = nodeMap.get(pos);
    return node ? [node.rect.x, node.rect.y] : null;
  }
  if (Array.isArray(pos)) return pos;
  if ('direction' in pos) {
    // AtPosition：from of 节点中心，按 direction 单位向量 × distance 偏移
    const ref = nodeMap.get(pos.of);
    if (!ref) return null;
    const distance = pos.distance ?? nodeDistance;
    const [dx, dy] = DIRECTION_VECTOR[pos.direction];
    return [ref.rect.x + dx * distance, ref.rect.y + dy * distance];
  }
  // PolarPosition：先解析 origin 再叠加极偏移
  let origin: IRPosition;
  if (!pos.origin) {
    origin = [0, 0];
  } else {
    const resolved = resolvePosition(pos.origin, nodeMap, nodeDistance);
    if (!resolved) return null;
    origin = resolved;
  }
  const rad = (pos.angle * Math.PI) / 180;
  return [
    origin[0] + Math.cos(rad) * pos.radius,
    origin[1] + Math.sin(rad) * pos.radius,
  ];
};
