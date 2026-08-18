import type { Position } from '@retikz/math';

import type { BoundaryDefinition, ConnectionEnvelopeKind, ShapeDefinition } from '../../contract';
import type { BoundaryReferenceResolution } from '../../resolve';
import type { BoundaryGeometryDefinition, BoundaryGeometryResolution, BoundaryGeometryResolveContext } from './types';

import {
  isFatalProbeError,
  isRetikzLayoutProbeRecoverableError,
  RetikzCompositeContractError,
  RetikzLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import { boundsConnectionEnvelope, isDirectionalAnchor, rect as rectOps } from '../../shared';
import { CompileWarningCode } from '../constants';
import { withProviderOutputValidationBoundary } from '../scene-primitive';

/** 同一 layout 在局部 / 全局投影后尺寸可能不同，缓存 key 必须包含 rect 几何 */
const connectionEnvelopeCacheKey = (
  rect: BoundaryGeometryResolveContext['visualRect'],
  kind: ConnectionEnvelopeKind,
): string => `${kind}:${rect.x}:${rect.y}:${rect.width}:${rect.height}:${rect.rotate ?? 0}`;

/** 校验 Shape definition 返回的安全包络 */
const validateConnectionEnvelope = (
  shapeName: string,
  kind: ConnectionEnvelopeKind,
  envelope: unknown,
  irPath?: string,
): Readonly<{ halfWidth: number; halfHeight: number }> => {
  const path = irPath ?? 'node';
  if (envelope === null || typeof envelope !== 'object') {
    throw new RetikzCompositeContractError(
      `Shape '${shapeName}' returned an invalid ${kind} connection envelope at ${path}: expected an object with finite positive half-axes`,
    );
  }
  const { halfWidth, halfHeight } = envelope as Record<string, unknown>;
  if (typeof halfWidth !== 'number' || typeof halfHeight !== 'number') {
    throw new RetikzCompositeContractError(
      `Shape '${shapeName}' returned an invalid ${kind} connection envelope at ${path}: expected numeric half-axes`,
    );
  }
  if (!Number.isFinite(halfWidth) || !Number.isFinite(halfHeight) || halfWidth <= 0 || halfHeight <= 0) {
    throw new RetikzCompositeContractError(
      `Shape '${shapeName}' returned an invalid ${kind} connection envelope at ${path}: expected finite positive half-axes, received [${halfWidth}, ${halfHeight}]`,
    );
  }
  const tolerance = Number.EPSILON * Math.max(1, halfWidth, halfHeight) * 8;
  if (kind === 'circle' && Math.abs(halfWidth - halfHeight) > tolerance) {
    throw new RetikzCompositeContractError(
      `Shape '${shapeName}' returned an invalid circle connection envelope at ${path}: half-axes must be equal, received [${halfWidth}, ${halfHeight}]`,
    );
  }
  return { halfWidth, halfHeight };
};

/** 解析并缓存视觉 shape 对规则连接面的安全包络矩形 */
const connectionEnvelopeOf = (kind: ConnectionEnvelopeKind, context: BoundaryGeometryResolveContext) => {
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
  const resolved = {
    ...context.visualRect,
    width: envelope.halfWidth * 2,
    height: envelope.halfHeight * 2,
  };
  context.connectionEnvelopeCache?.set(cacheKey, resolved);
  return resolved;
};

/** 校验 Boundary provider 解析出的最终矩形 */
const validateResolvedRect = (providerName: string, value: unknown, irPath?: string) => {
  if (value === null || typeof value !== 'object') {
    throw new RetikzCompositeContractError(
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
    throw new RetikzCompositeContractError(
      `Boundary '${providerName}' resolved an invalid rect at ${irPath ?? 'node'}: expected finite positive width and height`,
    );
  }
  return { x, y, width, height, ...(rotate === undefined ? {} : { rotate }) };
};

const asGeometryDefinition = (definition: BoundaryDefinition | ShapeDefinition): BoundaryGeometryDefinition =>
  definition;

/** 将已解析连接面引用绑定到视觉 rect 并执行 provider 几何 */
export const resolveBoundary = (
  resolution: BoundaryReferenceResolution,
  context: BoundaryGeometryResolveContext,
): BoundaryGeometryResolution => {
  if (resolution.isShape) {
    return { def: asGeometryDefinition(resolution.definition), rect: context.visualRect, params: resolution.params };
  }
  const boundaryDef = resolution.definition as BoundaryDefinition;
  let rect = context.visualRect;
  if (boundaryDef.resolveRect !== undefined) {
    let rawRect: unknown;
    try {
      rawRect = boundaryDef.resolveRect(
        {
          visualRect: context.visualRect,
          connectionEnvelope: kind => connectionEnvelopeOf(kind, context),
        },
        resolution.params,
      );
    } catch (error) {
      if (isFatalProbeError(error) || isRetikzLayoutProbeRecoverableError(error)) throw error;
      const message = safeThrownDetail(error);
      throw new RetikzLayoutProbeRecoverableError(
        `Boundary '${resolution.name}' failed to resolve its rect at ${context.irPath ?? 'node'}: ${message}`,
        { cause: error, providerKey: `boundary:${resolution.name}` },
      );
    }
    rect = withProviderOutputValidationBoundary(`Boundary '${resolution.name}' resolveRect`, () =>
      validateResolvedRect(resolution.name, rawRect, context.irPath),
    );
  }
  return { def: asGeometryDefinition(boundaryDef), rect, params: resolution.params };
};

export const fallbackBoundaryAnchor = (rect: BoundaryGeometryResolution['rect'], name: string): Position | undefined =>
  isDirectionalAnchor(name) ? rectOps.anchor(rect, name) : undefined;
