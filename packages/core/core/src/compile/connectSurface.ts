import type { Rect } from '../geometry/rect';
import type { IRConnectSurface } from '../ir';
import type { IRJsonObject } from '../ir/json';
import type { ShapeDefinition } from '../shapes';
import { ellipse, rectangle } from '../shapes';

/** 保留字：连接面 = 节点自身视觉形状 */
const SELF = 'shape';
/** 保留字：真圆（半径 = AABB 较长半轴） */
const CIRCLE = 'circle';

/** 把 rect 收成边长 = max(width, height) 的正方（中心 / rotate 不变）——circle 连接面用 */
const squareToMax = (rect: Rect): Rect => {
  const side = Math.max(rect.width, rect.height);
  return { x: rect.x, y: rect.y, width: side, height: side, rotate: rect.rotate };
};

/**
 * 把连接面取值解析为「计算 boundaryPoint / anchor 所需的 def + rect + params」
 * @description layout-neutral：borrowed/builtin 一律喂目标节点的视觉 AABB rect，绝不调其 circumscribe。
 *   保留字 'shape' → 视觉 def 原样；'circle' → ellipse def + squared-to-max rect；
 *   保留字 'rectangle' / 'ellipse' → 对应内置 def + 视觉 AABB；其余 → registry 查表。
 *   保留字优先于 registry 同名 shape。
 */
export const resolveConnectSurface = (
  surface: IRConnectSurface | undefined,
  visualDef: ShapeDefinition,
  visualRect: Rect,
  visualParams: IRJsonObject,
  registry: Record<string, ShapeDefinition>,
): { def: ShapeDefinition; rect: Rect; params: IRJsonObject } => {
  if (surface === undefined || surface === SELF) {
    return { def: visualDef, rect: visualRect, params: visualParams };
  }
  if (surface === CIRCLE) {
    return { def: ellipse, rect: squareToMax(visualRect), params: {} };
  }
  if (surface === 'rectangle') {
    return { def: rectangle, rect: visualRect, params: {} };
  }
  if (surface === 'ellipse') {
    return { def: ellipse, rect: visualRect, params: {} };
  }
  const type = typeof surface === 'string' ? surface : surface.type;
  const rawParams = typeof surface === 'string' ? {} : (surface.params ?? {});
  const def = Object.prototype.hasOwnProperty.call(registry, type) ? registry[type] : undefined;
  if (!def) {
    throw new Error(
      `Unknown connection surface '${type}'; reserved: shape/circle, registered: ${Object.keys(registry).sort().join(', ')}`,
    );
  }
  const params = def.paramsSchema.parse(rawParams);
  return { def, rect: visualRect, params };
};

/** 连接面的稳定字符串判别（anchor cache key 用） */
export const surfaceKey = (surface: IRConnectSurface | undefined): string => {
  if (surface === undefined) return SELF;
  if (typeof surface === 'string') return surface;
  return `${surface.type}:${JSON.stringify(surface.params ?? {})}`;
};
