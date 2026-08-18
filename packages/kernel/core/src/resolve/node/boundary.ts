import type { BoundaryDefinition, ShapeDefinition } from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type { IRBoundary, IRJsonObject } from '../../schemas';
import type { BoundaryReferenceResolution } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { parseProviderPayload } from '../provider-payload';

/** 保留字：连接面 = 节点自身视觉形状 */
const SELF = 'shape';

/** 连接面引用解析所需的 provider 与视觉 shape 上下文 */
export type BoundaryReferenceResolveContext = {
  /** 节点视觉形状 definition */
  visualDef: ShapeDefinition;
  /** 节点视觉形状参数 */
  visualParams: IRJsonObject;
  /** shape 注册表 */
  shapeRegistry: ProviderCollection<ShapeDefinition>;
  /** boundary 注册表 */
  boundaryRegistry: ProviderCollection<BoundaryDefinition>;
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

/** 解析连接面引用，绑定 provider definition 与参数，延迟依赖视觉 rect 的几何计算 */
export const resolveBoundaryReference = (
  boundary: IRBoundary | undefined,
  context: BoundaryReferenceResolveContext,
): BoundaryReferenceResolution => {
  if (boundary === undefined || boundary === SELF) {
    return {
      name: context.visualDef.name,
      definition: context.visualDef,
      params: context.visualParams,
      isShape: true,
    };
  }
  const type = typeof boundary === 'string' ? boundary : boundary.type;
  const rawParams = typeof boundary === 'string' ? {} : (boundary.params ?? {});
  const paramsPath = `${context.irPath ?? 'node'}.boundary.params`;
  const boundaryDef = providerOf(context.boundaryRegistry, type);
  if (boundaryDef !== undefined) {
    return {
      name: type,
      definition: boundaryDef,
      params: parseProviderPayload({
        capability: 'boundary',
        providerName: type,
        irPath: paramsPath,
        payloadName: 'params',
        schema: boundaryDef.paramsSchema,
        value: rawParams,
      }),
      isShape: false,
    };
  }
  const shapeDef = providerOf(context.shapeRegistry, type);
  if (shapeDef !== undefined) {
    return {
      name: type,
      definition: shapeDef,
      params: parseProviderPayload({
        capability: 'shape',
        providerName: type,
        irPath: paramsPath,
        payloadName: 'params',
        schema: shapeDef.paramsSchema,
        value: rawParams,
      }),
      isShape: true,
    };
  }
  throw new RetikzCoreError(
    RetikzCoreErrorCode.Resolve,
    `Unknown connection surface provider '${type}'; registered boundaries: ${registeredNames(context.boundaryRegistry)}; registered shapes: ${registeredNames(context.shapeRegistry)}. Pass boundary definitions via options.boundaries or shape definitions via options.shapes.`,
  );
};

/** 连接面的稳定字符串判别（anchor cache key 用） */
export const boundaryKey = (boundary: IRBoundary | undefined): string => {
  if (boundary === undefined) return SELF;
  if (typeof boundary === 'string') return boundary;
  return `${boundary.type}:${JSON.stringify(boundary.params ?? {})}`;
};
