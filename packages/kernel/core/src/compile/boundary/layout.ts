import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';
import type { CenteredBox, Position } from '@retikz/math';
import { DEG_TO_RAD, point } from '@retikz/math';

import type { BoundaryDefinition, ConnectionEnvelope, ConnectionEnvelopeKind } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CanonicalNodeBoundary } from '../../resolve';
import {
  boundaryKey,
  guardProviderOutput,
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve';
import type { IRAnchorRef, IRBoundary, IRPosition } from '../../schemas';
import type { Side } from '../../shared';
import { boundsConnectionEnvelope, CenterAnchor, isAnchor, isDirectionalAnchor, rect as rectOps } from '../../shared';
import { BuiltinCompileWarningCode, snapshotProviderPosition } from '../shared';
import { calculateExpandedBoundaryRect } from './helpers';
import type { BoundaryResolution, BoundaryState, BoundaryVisualResolution, CompiledBoundaryGeometry } from './types';

/** 同一 layout 在局部 / 全局投影后尺寸可能不同，缓存 key 必须包含 rect 几何 */
const formatConnectionEnvelopeCacheKey = (
  rect: BoundaryVisualResolution['rect'],
  kind: ConnectionEnvelopeKind,
): string => `${kind}:${rect.x}:${rect.y}:${rect.width}:${rect.height}:${rect.rotate ?? 0}`;

/** 校验 Shape definition 返回的安全包络 */
const snapshotConnectionEnvelope = (
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
const getOrCreateConnectionEnvelope = (
  kind: ConnectionEnvelopeKind,
  visual: BoundaryVisualResolution,
  state: BoundaryState,
) => {
  const { def, rect, params } = visual;
  const { connectionEnvelopeCache, connectionEnvelopeWarnings, warn, irPath } = state;
  const cacheKey = formatConnectionEnvelopeCacheKey(rect, kind);
  const cached = connectionEnvelopeCache?.get(cacheKey);
  if (cached !== undefined) return cached;

  const rawOwn = def.computeConnectionEnvelope?.(rect, kind, params);
  const own =
    rawOwn === undefined
      ? undefined
      : guardProviderOutput(`Shape '${def.name}' connectionEnvelope`, () =>
          snapshotConnectionEnvelope(def.name, kind, rawOwn, irPath),
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
const snapshotBoundaryRect = (providerName: string, value: CenteredBox, irPath?: PropertyPath) => {
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
export const bindBoundary = (
  canon: CanonicalNodeBoundary,
  visual: BoundaryVisualResolution,
  state: BoundaryState,
): BoundaryResolution => {
  const { rect: visualRect } = visual;
  const { irPath } = state;
  if (canon.isShape) {
    return { def: canon.definition, rect: visualRect, params: canon.params };
  }

  const boundaryDef = canon.definition as BoundaryDefinition;
  let rect = visualRect;
  if (boundaryDef.resolveRect !== undefined) {
    let rawRect: CenteredBox;

    try {
      rawRect = boundaryDef.resolveRect(
        {
          visualRect,
          computeConnectionEnvelope: kind => getOrCreateConnectionEnvelope(kind, visual, state),
        },
        canon.params,
      );
    } catch (error) {
      if (isFatalProbeError(error) || isLayoutProbeRecoverableError(error)) throw error;

      const message = safeThrownDetail(error);
      throw createLayoutProbeRecoverableError(
        `Boundary '${canon.name}' failed to resolve its rect at ${formatPropertyPath(irPath ?? [])}: ${message}`,
        { cause: error, providerKey: `boundary:${canon.name}` },
      );
    }

    rect = guardProviderOutput(`Boundary '${canon.name}' resolveRect`, () =>
      snapshotBoundaryRect(canon.name, rawRect, irPath),
    );
  }

  return { def: boundaryDef, rect, params: canon.params };
};

/** 保留合法 undefined fallback，并校验 provider 实际返回的二维坐标 */
const snapshotOptionalProviderPosition = (owner: string, value: Position | undefined): Position | undefined =>
  value === undefined ? undefined : snapshotProviderPosition(owner, value);

/** 取视觉 rect 外扩 margin 后的外边界 */
export const calculateOuterBoundaryRect = (layout: Pick<CompiledBoundaryGeometry, 'geometry'>): CenteredBox =>
  calculateExpandedBoundaryRect(layout.geometry.rect, layout.geometry.margin);

/** 从视觉形状绑定投影出连接面配置，不重新解析定义 */
const shapeBoundaryResolutionOf = (layout: CompiledBoundaryGeometry): CanonicalNodeBoundary => ({
  name: layout.shape.name,
  definition: layout.shape.definition,
  params: layout.shape.params,
  isShape: true,
});

/** 选取已绑定的连接面配置并结合布局几何求值 */
const bindLayoutBoundary = (
  layout: CompiledBoundaryGeometry,
  boundary: IRBoundary | undefined,
  canon?: CanonicalNodeBoundary,
  warn?: (code: string, message: string) => void,
  state?: BoundaryState,
) => {
  const resolution =
    canon ??
    (boundary === 'shape'
      ? shapeBoundaryResolutionOf(layout)
      : boundary === undefined ||
          boundary === layout.boundary.name ||
          boundaryKey(boundary) === boundaryKey({ type: layout.boundary.name, params: layout.boundary.params })
        ? layout.boundary
        : undefined);
  if (resolution === undefined) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Boundary '${boundaryKey(boundary)}' was not resolved for shape '${layout.shape.name}'`,
    );
  }

  return bindBoundary(
    resolution,
    { def: layout.shape.definition, rect: layout.geometry.rect, params: layout.shape.params },
    { ...state, warn: state?.warn ?? warn },
  );
};

/** 取连接面在 toward 方向的附着点 */
export const evaluateBoundaryPoint = (
  layout: CompiledBoundaryGeometry,
  toward: Position,
  boundary?: IRBoundary,
  canon?: CanonicalNodeBoundary,
  warn?: (code: string, message: string) => void,
  state?: BoundaryState,
): Position => {
  const { def, rect, params } = bindLayoutBoundary(layout, boundary, canon, warn, state);
  const raw = def.computeBoundaryPoint(calculateExpandedBoundaryRect(rect, layout.geometry.margin), toward, params);
  return snapshotProviderPosition(`Boundary '${boundaryKey(boundary)}' boundaryPoint`, raw);
};

/** 沿折线移除起始连接面内的前缀，保留原线段上的出界交点 */
export const clipBoundaryPolyline = (
  layout: CompiledBoundaryGeometry,
  points: ReadonlyArray<Position>,
  boundary?: IRBoundary,
  canon?: CanonicalNodeBoundary,
  warn?: (code: string, message: string) => void,
  state?: BoundaryState,
): Array<Position> => {
  const { def, rect, params } = bindLayoutBoundary(layout, boundary, canon, warn, state);
  const outer = calculateExpandedBoundaryRect(rect, layout.geometry.margin);
  const center: Position = [outer.x, outer.y];
  const boundaryAt = (position: Position): Position =>
    snapshotProviderPosition(
      `Boundary '${boundaryKey(boundary)}' boundaryPoint`,
      def.computeBoundaryPoint(outer, position, params),
    );
  const contains = (position: Position): boolean =>
    point.isEqual(position, center) || point.distance(center, position) <= point.distance(center, boundaryAt(position));

  for (let index = 0; index < points.length; index += 1) {
    const outside = points[index];
    if (contains(outside)) continue;
    if (index === 0) return [...points];
    if (point.isEqual(points[index - 1], center)) return [boundaryAt(outside), ...points.slice(index)];

    // 沿原线段求内外分界，避免改用中心射线后破坏正交方向
    let inside = points[index - 1];
    let edge = outside;
    for (let iteration = 0; iteration < 48; iteration += 1) {
      const midpoint: Position = [(inside[0] + edge[0]) / 2, (inside[1] + edge[1]) / 2];
      if (contains(midpoint)) inside = midpoint;
      else edge = midpoint;
    }
    return [edge, ...points.slice(index)];
  }

  return [];
};

/** 取视觉形状的命名 anchor；标准 anchor 可选在 boundary 拟合后应用 margin */
export const evaluateNamedBoundaryAnchor = (
  layout: CompiledBoundaryGeometry,
  name: string,
  boundary?: IRBoundary,
  applyMargin = false,
  canon?: CanonicalNodeBoundary,
  state?: BoundaryState,
): Position => {
  /** 将标准方向锚点退回到矩形边界求解；非标准名称返回 undefined */
  const calculateFallbackAnchor = (boundaryRect: CenteredBox, anchorName: string): Position | undefined =>
    isDirectionalAnchor(anchorName) ? rectOps.anchor(boundaryRect, anchorName) : undefined;

  if (isAnchor(name)) {
    if (name === CenterAnchor.Center) {
      const own = snapshotOptionalProviderPosition(
        `Shape '${layout.shape.name}' anchor`,
        layout.shape.definition.resolveAnchor(layout.geometry.rect, CenterAnchor.Center, layout.shape.params),
      );
      return own ?? [layout.geometry.rect.x, layout.geometry.rect.y];
    }

    // 标准方位名优先走视觉 shape 自身 anchor；未实现时回退外接 AABB。
    if (boundary === 'shape') {
      const shapeRect = applyMargin
        ? calculateExpandedBoundaryRect(layout.geometry.rect, layout.geometry.margin)
        : layout.geometry.rect;
      const own = snapshotOptionalProviderPosition(
        `Shape '${layout.shape.name}' anchor`,
        layout.shape.definition.resolveAnchor(shapeRect, name, layout.shape.params),
      );
      if (own !== undefined) return own;

      const fallbackRect = applyMargin
        ? calculateExpandedBoundaryRect(layout.geometry.rect, layout.geometry.margin)
        : layout.geometry.rect;
      const p = calculateFallbackAnchor(fallbackRect, name);
      if (p === undefined)
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `Unknown anchor '${name}' for shape '${layout.shape.name}'`,
        );

      return p;
    }

    const { def, rect, params } = bindLayoutBoundary(layout, boundary, canon, undefined, state);
    const anchorRect = applyMargin ? calculateExpandedBoundaryRect(rect, layout.geometry.margin) : rect;
    const raw = def.resolveAnchor?.(anchorRect, name, params);
    const p =
      snapshotOptionalProviderPosition(`Boundary '${boundaryKey(boundary)}' anchor`, raw) ??
      calculateFallbackAnchor(anchorRect, name);
    if (p === undefined)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Unknown anchor '${name}' for shape '${layout.shape.name}'`,
      );

    return p;
  }

  // 形状专属命名 anchor 恒走视觉形状。
  const p = snapshotOptionalProviderPosition(
    `Shape '${layout.shape.name}' anchor`,
    layout.shape.definition.resolveAnchor(layout.geometry.rect, name, layout.shape.params),
  );
  if (p === undefined) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `Unknown anchor '${name}' for shape '${layout.shape.name}'`);
  }

  return p;
};

/** 取连接面在指定角度方向的边界点 */
export const evaluateAngleBoundaryPoint = (
  layout: CompiledBoundaryGeometry,
  angleDeg: number,
  boundary?: IRBoundary,
  applyMargin = false,
  canon?: CanonicalNodeBoundary,
  state?: BoundaryState,
): Position => {
  const rad = angleDeg * DEG_TO_RAD;
  const lx = Math.cos(rad);
  const ly = Math.sin(rad);
  const { def, rect, params } = bindLayoutBoundary(layout, boundary, canon, undefined, state);
  const boundaryRect = applyMargin ? calculateExpandedBoundaryRect(rect, layout.geometry.margin) : rect;
  const rot = boundaryRect.rotate ?? 0;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  // 局部方向转为世界方向。
  const toward: Position = [boundaryRect.x + lx * cosR - ly * sinR, boundaryRect.y + lx * sinR + ly * cosR];
  const raw = def.computeBoundaryPoint(boundaryRect, toward, params);

  return snapshotProviderPosition(`Boundary '${boundaryKey(boundary)}' boundaryPoint`, raw);
};

/** 角度字符串识别规则，与文本 target parser 保持一致 */
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

/** 不经过 WeakMap 缓存解析命名或角度 anchor */
const evaluateNamedAnchor = (
  layout: CompiledBoundaryGeometry,
  anchorName: string,
  boundary: IRBoundary | undefined,
  canon?: CanonicalNodeBoundary,
  state?: BoundaryState,
): IRPosition => {
  if (ANGLE_RE.test(anchorName)) {
    return evaluateAngleBoundaryPoint(layout, Number(anchorName), boundary, true, canon, state);
  }

  return evaluateNamedBoundaryAnchor(layout, anchorName, boundary, isAnchor(anchorName), canon, state);
};

/** 不经过 WeakMap 缓存解析视觉 shape 的边上比例点 */
const calculateEdgePoint = (layout: CompiledBoundaryGeometry, side: Side, fraction: number): IRPosition => {
  const { computeEdgePoint: edgePoint } = layout.shape.definition;
  if (!edgePoint) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `shape '${layout.shape.name}' does not support side anchors ({ side, fraction })`,
    );
  }

  if (layout.geometry.rect.width === 0 && layout.geometry.rect.height === 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `{ side, fraction } is not meaningful on a zero-size target (shape '${layout.shape.name}')`,
    );
  }

  const raw = edgePoint(layout.geometry.rect, side, fraction, layout.shape.params);

  return snapshotProviderPosition(`Shape '${layout.shape.name}' edgePoint`, raw);
};

/**
 * 不经过 WeakMap 缓存解析完整 anchor 引用
 * @description 供仍会整体平移的 provisional layout 使用，避免缓存平移前坐标
 */
export const evaluateAnchorReference = (
  layout: CompiledBoundaryGeometry,
  anchor: IRAnchorRef,
  boundary?: IRBoundary,
  canon?: CanonicalNodeBoundary,
  state?: BoundaryState,
): IRPosition => {
  if (typeof anchor === 'number') return evaluateNamedAnchor(layout, String(anchor), boundary, canon, state);
  if (typeof anchor === 'string') return evaluateNamedAnchor(layout, anchor, boundary, canon, state);
  return calculateEdgePoint(layout, anchor.side, anchor.fraction);
};
