import type { Position } from '@retikz/math';

import type { BoundaryAnchorName, BoundaryDefinition, ShapeDefinition } from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type { IRBoundary, IRJsonObject } from '../../schemas';
import type { Rect } from '../../shared/geometry';

import { resolveBoundaryRegistry } from '../../providers/boundary';
import { isDirectionalAnchor, rect as rectOps } from '../../shared';
import { parseProviderPayload } from '../provider-payload';

/** 保留字：连接面 = 节点自身视觉形状 */
const SELF = 'shape';

type ResolvedBoundaryDefinition = {
  name: string;
  boundaryPoint: (rect: Rect, toward: Position, params: IRJsonObject) => Position;
  anchor?: (rect: Rect, name: BoundaryAnchorName, params: IRJsonObject) => ReturnType<ShapeDefinition['anchor']>;
};

/** 连接面解析上下文 */
export type ResolveBoundaryContext = {
  /** 节点视觉形状 definition */
  visualDef: ShapeDefinition;
  /** 节点视觉形状 rect */
  visualRect: Rect;
  /** 节点视觉形状参数 */
  visualParams: IRJsonObject;
  /** shape 注册表 */
  shapeRegistry: ProviderCollection<ShapeDefinition>;
  /** boundary 注册表 */
  boundaryRegistry?: ProviderCollection<BoundaryDefinition>;
  /** 当前 node 的 IR 路径，用于 provider payload 诊断 */
  irPath?: string;
};

const providerOf = <TDefinition>(registry: ProviderCollection<TDefinition>, key: string): TDefinition | undefined =>
  Array.isArray(registry)
    ? registry.find(item => item.name === key)
    : (registry as ReadonlyMap<string, TDefinition>).get(key);

const registeredNames = <TDefinition>(registry: ProviderCollection<TDefinition>): string => {
  const names = Array.isArray(registry) ? registry.map(definition => definition.name) : [...registry.keys()];
  return names.sort().join(', ') || '(none registered)';
};

/** 解析连接面引用，返回可用于 boundaryPoint / anchor 的定义和参数 */
export const resolveBoundary = (
  boundary: IRBoundary | undefined,
  context: ResolveBoundaryContext,
): { def: ResolvedBoundaryDefinition; rect: Rect; params: IRJsonObject } => {
  const { visualDef, visualRect, visualParams, shapeRegistry, boundaryRegistry = resolveBoundaryRegistry() } = context;
  if (boundary === undefined || boundary === SELF) {
    return { def: visualDef, rect: visualRect, params: visualParams };
  }
  const type = typeof boundary === 'string' ? boundary : boundary.type;
  const rawParams = typeof boundary === 'string' ? {} : (boundary.params ?? {});
  const paramsPath = `${context.irPath ?? 'node'}.boundary.params`;
  const boundaryDef = providerOf(boundaryRegistry, type);
  if (boundaryDef !== undefined) {
    return {
      def: boundaryDef,
      rect: visualRect,
      params: parseProviderPayload({
        capability: 'boundary',
        providerName: type,
        irPath: paramsPath,
        payloadName: 'params',
        schema: boundaryDef.paramsSchema,
        value: rawParams,
      }),
    };
  }
  const shapeDef = providerOf(shapeRegistry, type);
  if (shapeDef !== undefined) {
    return {
      def: shapeDef,
      rect: visualRect,
      params: parseProviderPayload({
        capability: 'shape',
        providerName: type,
        irPath: paramsPath,
        payloadName: 'params',
        schema: shapeDef.paramsSchema,
        value: rawParams,
      }),
    };
  }
  throw new Error(
    `Unknown connection surface provider '${type}'; registered boundaries: ${registeredNames(boundaryRegistry)}; registered shapes: ${registeredNames(shapeRegistry)}. Pass boundary definitions via options.boundaries or shape definitions via options.shapes.`,
  );
};

export const fallbackBoundaryAnchor = (rect: Rect, name: string): ReturnType<ShapeDefinition['anchor']> =>
  isDirectionalAnchor(name) ? rectOps.anchor(rect, name) : undefined;

/** 连接面的稳定字符串判别（anchor cache key 用） */
export const boundaryKey = (boundary: IRBoundary | undefined): string => {
  if (boundary === undefined) return SELF;
  if (typeof boundary === 'string') return boundary;
  return `${boundary.type}:${JSON.stringify(boundary.params ?? {})}`;
};
