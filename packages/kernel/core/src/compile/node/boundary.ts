import type { Position } from '@retikz/math';

import type { BoundaryAnchorName, BoundaryDefinition, ConnectionEnvelopeKind, ShapeDefinition } from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type { IRBoundary, IRJsonObject } from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { CompileWarningCodeValue } from '../warning';

import { resolveBoundaryRegistry } from '../../providers/boundary';
import { boundsConnectionEnvelope, isDirectionalAnchor, rect as rectOps } from '../../shared';
import { CompileWarningCode } from '../constants';
import {
  CompositeContractError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  LayoutProbeRecoverableError,
  safeThrownDetail,
} from '../probe-failure';
import { parseProviderPayload } from '../provider-payload';
import { withProviderOutputValidationBoundary } from '../scene-primitive';

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
  /** shape-aware envelope 缓存；key 包含 kind 与视觉 rect 尺寸 */
  connectionEnvelopeCache?: Map<string, Rect>;
  /** compile warning 去重集合 */
  connectionEnvelopeWarnings?: Set<ConnectionEnvelopeKind>;
  /** compile warning 分发函数 */
  warn?: (code: CompileWarningCodeValue, message: string) => void;
};

/** 同一 layout 在局部 / 全局投影后尺寸可能不同，缓存 key 必须包含 rect 几何 */
const connectionEnvelopeCacheKey = (rect: Rect, kind: ConnectionEnvelopeKind): string =>
  `${kind}:${rect.x}:${rect.y}:${rect.width}:${rect.height}:${rect.rotate ?? 0}`;

/** 校验 Shape definition 返回的安全包络 */
const validateConnectionEnvelope = (
  shapeName: string,
  kind: ConnectionEnvelopeKind,
  envelope: unknown,
  irPath?: string,
): Readonly<{ halfWidth: number; halfHeight: number }> => {
  const path = irPath ?? 'node';
  if (envelope === null || typeof envelope !== 'object') {
    throw new CompositeContractError(
      `Shape '${shapeName}' returned an invalid ${kind} connection envelope at ${path}: expected an object with finite positive half-axes`,
    );
  }
  const { halfWidth, halfHeight } = envelope as Record<string, unknown>;
  if (typeof halfWidth !== 'number' || typeof halfHeight !== 'number') {
    throw new CompositeContractError(
      `Shape '${shapeName}' returned an invalid ${kind} connection envelope at ${path}: expected numeric half-axes`,
    );
  }
  if (!Number.isFinite(halfWidth) || !Number.isFinite(halfHeight) || halfWidth <= 0 || halfHeight <= 0) {
    throw new CompositeContractError(
      `Shape '${shapeName}' returned an invalid ${kind} connection envelope at ${path}: expected finite positive half-axes, received [${halfWidth}, ${halfHeight}]`,
    );
  }
  const tolerance = Number.EPSILON * Math.max(1, halfWidth, halfHeight) * 8;
  if (kind === 'circle' && Math.abs(halfWidth - halfHeight) > tolerance) {
    throw new CompositeContractError(
      `Shape '${shapeName}' returned an invalid circle connection envelope at ${path}: half-axes must be equal, received [${halfWidth}, ${halfHeight}]`,
    );
  }
  return { halfWidth, halfHeight };
};

/** 解析并缓存视觉 shape 对规则连接面的安全包络矩形 */
const connectionEnvelopeOf = (kind: ConnectionEnvelopeKind, context: ResolveBoundaryContext): Rect => {
  const cacheKey = connectionEnvelopeCacheKey(context.visualRect, kind);
  const cached = context.connectionEnvelopeCache?.get(cacheKey);
  if (cached !== undefined) return cached;

  const rawOwn = context.visualDef.connectionEnvelope?.(context.visualRect, kind, context.visualParams);
  const own =
    rawOwn === undefined
      ? undefined
      : withProviderOutputValidationBoundary(`Shape '${context.visualDef.name}' connectionEnvelope`, () =>
          validateConnectionEnvelope(context.visualDef.name, kind, rawOwn, context.irPath),
        );
  const envelope = own ?? boundsConnectionEnvelope(context.visualRect, kind);
  if (own === undefined && !context.connectionEnvelopeWarnings?.has(kind)) {
    context.connectionEnvelopeWarnings?.add(kind);
    context.warn?.(
      CompileWarningCode.BoundaryTightFallback,
      `Shape '${context.visualDef.name}' does not provide a ${kind} connection envelope; falling back to visual bounds.`,
    );
  }
  const resolved: Rect = {
    ...context.visualRect,
    width: envelope.halfWidth * 2,
    height: envelope.halfHeight * 2,
  };
  context.connectionEnvelopeCache?.set(cacheKey, resolved);
  return resolved;
};

/** 校验 Boundary provider 解析出的最终矩形 */
const validateResolvedRect = (providerName: string, value: unknown, irPath?: string): Rect => {
  if (value === null || typeof value !== 'object') {
    throw new CompositeContractError(
      `Boundary '${providerName}' resolved an invalid rect at ${irPath ?? 'node'}: expected an object`,
    );
  }
  const { x, y, width, height, rotate } = value as Record<string, unknown>;
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    (rotate !== undefined && typeof rotate !== 'number') ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    (rotate !== undefined && !Number.isFinite(rotate)) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new CompositeContractError(
      `Boundary '${providerName}' resolved an invalid rect at ${irPath ?? 'node'}: expected finite positive width and height`,
    );
  }
  return { x, y, width, height, ...(rotate === undefined ? {} : { rotate }) };
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
    const params = parseProviderPayload({
      capability: 'boundary',
      providerName: type,
      irPath: paramsPath,
      payloadName: 'params',
      schema: boundaryDef.paramsSchema,
      value: rawParams,
    });
    let rect: Rect;
    if (boundaryDef.resolveRect === undefined) {
      rect = visualRect;
    } else {
      let rawRect: unknown;
      try {
        rawRect = boundaryDef.resolveRect(
          {
            visualRect,
            connectionEnvelope: kind => connectionEnvelopeOf(kind, context),
          },
          params,
        );
      } catch (error) {
        if (isFatalProbeError(error) || isLayoutProbeRecoverableError(error)) throw error;
        const message = safeThrownDetail(error);
        throw new LayoutProbeRecoverableError(
          `Boundary '${type}' failed to resolve its rect at ${context.irPath ?? 'node'}: ${message}`,
          { cause: error, providerKey: `boundary:${type}` },
        );
      }
      rect = withProviderOutputValidationBoundary(`Boundary '${type}' resolveRect`, () =>
        validateResolvedRect(type, rawRect, context.irPath),
      );
    }
    return {
      def: boundaryDef,
      rect,
      params,
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
