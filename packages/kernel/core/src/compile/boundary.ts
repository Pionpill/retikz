import type { BoundaryAnchorName, BoundaryDefinition } from '../contract/boundary';
import type { ShapeDefinition } from '../contract/shape';
import type { ProviderCollection } from '../providers/registry';
import type { IRBoundary } from '../schemas';
import type { IRJsonObject } from '../schemas';
import type { Position } from '../shared/geometry';
import type { Rect } from '../shared/geometry';

import { resolveBoundaryRegistry } from '../providers/boundary';
import { rectangle } from '../providers/shape';

/** 保留字：连接面 = 节点自身视觉形状 */
const SELF = 'shape';

type ResolvedBoundaryDefinition = {
  name: string;
  boundaryPoint: (rect: Rect, toward: Position, params: IRJsonObject) => Position;
  anchor?: (rect: Rect, name: BoundaryAnchorName, params: IRJsonObject) => ReturnType<ShapeDefinition['anchor']>;
};

const providerOf = <TDefinition>(
  registry: ProviderCollection<TDefinition>,
  key: string,
): TDefinition | undefined =>
  Array.isArray(registry)
    ? registry.find(item => item.name === key)
    : (registry as ReadonlyMap<string, TDefinition>).get(key);

const registeredNames = <TDefinition>(registry: ProviderCollection<TDefinition>): string => {
  const names = Array.isArray(registry) ? registry.map(definition => definition.name) : [...registry.keys()];
  return names.sort().join(', ') || '(none registered)';
};

/**
 * 把连接面取值解析为「计算 boundaryPoint / anchor 所需的 def + rect + params」
 * @description layout-neutral：borrowed/builtin 一律喂目标节点的视觉 AABB rect，绝不调其 circumscribe。
 *   保留字 'shape' → 视觉 def 原样；其它 key 先查 boundary 注册表，再兜底查 shape 注册表。
 *   boundary provider 优先于同名 shape 兜底。
 */
export const resolveBoundary = (
  boundary: IRBoundary | undefined,
  visualDef: ShapeDefinition,
  visualRect: Rect,
  visualParams: IRJsonObject,
  shapeRegistry: ProviderCollection<ShapeDefinition>,
  boundaryRegistry: ProviderCollection<BoundaryDefinition> = resolveBoundaryRegistry(),
): { def: ResolvedBoundaryDefinition; rect: Rect; params: IRJsonObject } => {
  if (boundary === undefined || boundary === SELF) {
    return { def: visualDef, rect: visualRect, params: visualParams };
  }
  const type = typeof boundary === 'string' ? boundary : boundary.type;
  const rawParams = typeof boundary === 'string' ? {} : (boundary.params ?? {});
  const boundaryDef = providerOf(boundaryRegistry, type);
  if (boundaryDef !== undefined) {
    return { def: boundaryDef, rect: visualRect, params: boundaryDef.paramsSchema.parse(rawParams) };
  }
  const shapeDef = providerOf(shapeRegistry, type);
  if (shapeDef !== undefined) {
    return { def: shapeDef, rect: visualRect, params: shapeDef.paramsSchema.parse(rawParams) };
  }
  throw new Error(
    `Unknown connection surface provider '${type}'; registered boundaries: ${registeredNames(boundaryRegistry)}; registered shapes: ${registeredNames(shapeRegistry)}. Pass boundary definitions via options.boundaries or shape definitions via options.shapes.`,
  );
};

export const fallbackBoundaryAnchor = (
  rect: Rect,
  name: string,
  params: IRJsonObject,
): ReturnType<ShapeDefinition['anchor']> => rectangle.anchor(rect, name, params);

/** 连接面的稳定字符串判别（anchor cache key 用） */
export const boundaryKey = (boundary: IRBoundary | undefined): string => {
  if (boundary === undefined) return SELF;
  if (typeof boundary === 'string') return boundary;
  return `${boundary.type}:${JSON.stringify(boundary.params ?? {})}`;
};
