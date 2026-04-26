import type { IRPosition, PolarPosition } from '../ir';
import type { NodeLayout } from './node';

/**
 * 把 IR 里出现的位置形态（笛卡尔 / 极坐标 / 节点 id）解析为笛卡尔位置。
 * 极坐标的 origin 可递归 / 可引用节点 id；按节点定义顺序处理（前向引用要求节点先定义）。
 * 解析失败返回 null（如引用了未定义节点）。
 */
export const resolvePosition = (
  pos: IRPosition | PolarPosition | string,
  nodeMap: Map<string, NodeLayout>,
): IRPosition | null => {
  if (typeof pos === 'string') {
    const node = nodeMap.get(pos);
    return node ? [node.rect.x, node.rect.y] : null;
  }
  if (Array.isArray(pos)) return pos;
  // PolarPosition：先解析 origin，再叠加极偏移
  let origin: IRPosition;
  if (!pos.origin) {
    origin = [0, 0];
  } else {
    const resolved = resolvePosition(pos.origin, nodeMap);
    if (!resolved) return null;
    origin = resolved;
  }
  const rad = (pos.angle * Math.PI) / 180;
  return [
    origin[0] + Math.cos(rad) * pos.radius,
    origin[1] + Math.sin(rad) * pos.radius,
  ];
};
