import type { JsonObject } from '@retikz/foundation';

import type { BoundaryDefinition, ShapeDefinition } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { ProviderRegistry } from '../../providers';
import type { IRBoundary } from '../../schemas';
import { parseProviderPayload } from '../provider';
import type { BoundaryResolution } from './types';

/** 解析连接面所需的节点形状与定义注册表 */
type NodeBoundaryResolveContext = {
  /** 节点视觉形状定义 */
  visualDef: ShapeDefinition;
  /** 节点视觉形状参数 */
  visualParams: JsonObject;
  /** 形状定义注册表 */
  shapeRegistry: ProviderRegistry<ShapeDefinition>;
  /** 连接面定义注册表 */
  boundaryRegistry: ProviderRegistry<BoundaryDefinition>;
  /** 当前节点的 IR 路径，用于参数校验错误定位 */
  irPath?: string;
};

/**
 * 为连接面选择定义并解析参数，几何计算留到节点尺寸确定之后
 * @description 未指定或指定 shape 时沿用节点自身形状；其余名称先查询连接面注册表，再查询形状注册表
 */
export const resolveNodeBoundary = (
  boundary: IRBoundary | undefined,
  context: NodeBoundaryResolveContext,
): BoundaryResolution => {
  if (boundary === undefined || boundary === 'shape') {
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
  const boundaryDef = context.boundaryRegistry.get(type);
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

  const shapeDef = context.shapeRegistry.get(type);
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

  /** 按名称排序列出已注册定义，供未知连接面的错误信息使用 */
  const registeredNames = <TDefinition>(registry: ProviderRegistry<TDefinition>): string => {
    const names = [...registry.keys()];
    return names.sort().join(', ') || '(none registered)';
  };

  throw new RetikzCoreError(
    RetikzCoreErrorCode.Resolve,
    `Unknown connection surface provider '${type}'; registered boundaries: ${registeredNames(context.boundaryRegistry)}; registered shapes: ${registeredNames(context.shapeRegistry)}. Pass boundary definitions via options.boundaries or shape definitions via options.shapes.`,
  );
};

/** 将连接面声明序列化为锚点缓存键，省略值与 shape 使用相同键 */
export const boundaryKey = (boundary: IRBoundary | undefined): string => {
  if (boundary === undefined) return 'shape';
  if (typeof boundary === 'string') return boundary;
  return `${boundary.type}:${JSON.stringify(boundary.params ?? {})}`;
};
