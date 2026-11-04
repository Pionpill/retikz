import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';
import type { CenteredBox, Position } from '@retikz/math';

import type { BoundaryDefinition, ConnectionEnvelope, ConnectionEnvelopeKind } from '../../contract';
import type { CanonicalNodeBoundary } from '../../resolve';
import {
  guardProviderOutput,
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve';
import { boundsConnectionEnvelope, isDirectionalAnchor, rect as rectOps } from '../../shared';
import { BuiltinCompileWarningCode } from '../shared';
import type { NodeBoundaryResolution, NodeBoundaryState, NodeVisualResolution } from './types';

/** 同一 layout 在局部 / 全局投影后尺寸可能不同，缓存 key 必须包含 rect 几何 */
const connectionEnvelopeCacheKey = (rect: NodeVisualResolution['rect'], kind: ConnectionEnvelopeKind): string =>
  `${kind}:${rect.x}:${rect.y}:${rect.width}:${rect.height}:${rect.rotate ?? 0}`;

/** 校验 Shape definition 返回的安全包络 */
const resolveConnectionEnvelope = (
  shapeName: string,
  kind: ConnectionEnvelopeKind,
  envelope: ConnectionEnvelope,
  irPath?: PropertyPath,
): Readonly<{ halfWidth: number; halfHeight: number }> => {
  const path = irPath ?? [];
  const { halfWidth, halfHeight } = envelope;
  if (!Number.isFinite(halfWidth) || !Number.isFinite(halfHeight) || halfWidth <= 0 || halfHeight <= 0) {
    throw createCompositeContractError(
      `Shape '${shapeName}' returned an invalid ${kind} connection envelope at ${formatPropertyPath(path)}: expected finite positive half-axes, received [${halfWidth}, ${halfHeight}]`,
    );
  }

  const tolerance = Number.EPSILON * Math.max(1, halfWidth, halfHeight) * 8;
  if (kind === 'circle' && Math.abs(halfWidth - halfHeight) > tolerance) {
    throw createCompositeContractError(
      `Shape '${shapeName}' returned an invalid circle connection envelope at ${formatPropertyPath(path)}: half-axes must be equal, received [${halfWidth}, ${halfHeight}]`,
    );
  }

  return { halfWidth, halfHeight };
};

/** 解析并缓存视觉 shape 对规则连接面的安全包络矩形 */
const connectionEnvelopeOf = (kind: ConnectionEnvelopeKind, visual: NodeVisualResolution, state: NodeBoundaryState) => {
  const { def, rect, params } = visual;
  const { connectionEnvelopeCache, connectionEnvelopeWarnings, warn, irPath } = state;
  const cacheKey = connectionEnvelopeCacheKey(rect, kind);
  const cached = connectionEnvelopeCache?.get(cacheKey);
  if (cached !== undefined) return cached;

  const rawOwn = def.computeConnectionEnvelope?.(rect, kind, params);
  const own =
    rawOwn === undefined
      ? undefined
      : guardProviderOutput(`Shape '${def.name}' connectionEnvelope`, () =>
          resolveConnectionEnvelope(def.name, kind, rawOwn, irPath),
        );
  const envelope = own ?? boundsConnectionEnvelope(rect, kind);
  if (own === undefined && !connectionEnvelopeWarnings?.has(kind)) {
    connectionEnvelopeWarnings?.add(kind);
    warn?.(
      BuiltinCompileWarningCode.BoundaryTightFallback,
      `Shape '${def.name}' does not provide a ${kind} connection envelope; falling back to visual bounds.`,
    );
  }

  const resolved = {
    ...rect,
    width: envelope.halfWidth * 2,
    height: envelope.halfHeight * 2,
  };
  connectionEnvelopeCache?.set(cacheKey, resolved);

  return resolved;
};

/** 校验 Boundary provider 解析出的最终矩形 */
const resolveBoundaryRect = (providerName: string, value: CenteredBox, irPath?: PropertyPath) => {
  const { x, y, width, height, rotate } = value;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    (rotate !== undefined && !Number.isFinite(rotate)) ||
    width <= 0 ||
    height <= 0
  ) {
    throw createCompositeContractError(
      `Boundary '${providerName}' resolved an invalid rect at ${formatPropertyPath(irPath ?? [])}: expected finite positive width and height`,
    );
  }

  return { x, y, width, height, ...(rotate === undefined ? {} : { rotate }) };
};

/** 将已解析连接面引用绑定到视觉 rect 并执行 provider 几何 */
export const resolveBoundary = (
  resolution: CanonicalNodeBoundary,
  visual: NodeVisualResolution,
  state: NodeBoundaryState,
): NodeBoundaryResolution => {
  const { rect: visualRect } = visual;
  const { irPath } = state;
  if (resolution.isShape) {
    return { def: resolution.definition, rect: visualRect, params: resolution.params };
  }

  const boundaryDef = resolution.definition as BoundaryDefinition;
  let rect = visualRect;
  if (boundaryDef.resolveRect !== undefined) {
    let rawRect: CenteredBox;

    try {
      rawRect = boundaryDef.resolveRect(
        {
          visualRect,
          computeConnectionEnvelope: kind => connectionEnvelopeOf(kind, visual, state),
        },
        resolution.params,
      );
    } catch (error) {
      if (isFatalProbeError(error) || isLayoutProbeRecoverableError(error)) throw error;

      const message = safeThrownDetail(error);
      throw createLayoutProbeRecoverableError(
        `Boundary '${resolution.name}' failed to resolve its rect at ${formatPropertyPath(irPath ?? [])}: ${message}`,
        { cause: error, providerKey: `boundary:${resolution.name}` },
      );
    }

    rect = guardProviderOutput(`Boundary '${resolution.name}' resolveRect`, () =>
      resolveBoundaryRect(resolution.name, rawRect, irPath),
    );
  }

  return { def: boundaryDef, rect, params: resolution.params };
};

/** 将标准方向锚点退回到矩形边界求解；非标准名称返回 undefined */
export const fallbackBoundaryAnchor = (rect: NodeBoundaryResolution['rect'], name: string): Position | undefined =>
  isDirectionalAnchor(name) ? rectOps.anchor(rect, name) : undefined;
