import type { ArrowEmitContext, PaintValue, ScenePrimitive, PathCommand, ResolvedArrowEnd } from '../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { ArrowMarkResolution } from '../../../resolve';
import { createLayoutProbeRecoverableError, safeThrownDetail } from '../../../resolve/diagnostics';
import type { PaintResolver } from '../../resource';
import { materializeScenePrimitives } from '../../resource';
import { shortenEndpointContacts } from './endpoint-contact';
import type { EndpointArrowSpecs } from './endpoint-contact';

/** 调用 arrow emit，并校验 marker 产物 */
const emitArrowMarkerPrimitives = (
  shape: string,
  def: ArrowMarkResolution['definition'],
  ctx: ArrowEmitContext,
): Array<ScenePrimitive> => {
  let emitted: Iterable<ScenePrimitive>;

  try {
    emitted = def.emit(ctx);
  } catch (e) {
    throw createLayoutProbeRecoverableError(`Arrow '${shape}' emit failed: ${safeThrownDetail(e)}`, {
      cause: e,
      providerKey: `arrow:${shape}`,
    });
  }

  return materializeScenePrimitives(`Arrow '${shape}'`, emitted);
};

/** 构造 ArrowDefinition.emit 的上下文 */
const buildEmitContext = (
  resolution: ArrowMarkResolution,
  round: (n: number) => number,
  resolvePaint: PaintResolver,
): ArrowEmitContext => {
  const { visual, definition } = resolution;
  const contextStroke: PaintValue = { kind: 'contextStroke' };
  const stroke: PaintValue = resolvePaint(visual.stroke) ?? contextStroke;
  const fill: PaintValue = definition.hollow ? contextStroke : (resolvePaint(visual.fill) ?? contextStroke);

  return {
    stroke,
    fill,
    lineWidth: visual.lineWidth,
    round,
    dashPattern: visual.dashPattern,
    dashOffset: visual.dashOffset,
    lineCap: visual.lineCap,
    lineJoin: visual.lineJoin,
  };
};

/** 把箭头视觉输入物化为 Scene 端点箭头描述 */
const emitArrowEnd = (
  resolution: ArrowMarkResolution,
  round: (n: number) => number,
  resolvePaint: PaintResolver,
): ResolvedArrowEnd => {
  const { visual, geometry, definition } = resolution;
  const ctx = buildEmitContext(resolution, round, resolvePaint);
  const marker = emitArrowMarkerPrimitives(visual.shape, definition, ctx);
  const out: ResolvedArrowEnd = {
    shape: visual.shape,
    baseSize: geometry.baseSize,
    refX: geometry.contactX,
    markerWidth: geometry.resolvedLength,
    markerHeight: geometry.resolvedWidth,
    marker,
  };
  if (visual.opacity !== undefined) out.opacity = visual.opacity;

  return out;
};

/** 已解析的端点箭头及对应 path 收缩量 */
export type EndpointArrowMarkEmission = {
  /** 已物化的 Scene 端点箭头描述 */
  spec: ResolvedArrowEnd;
  /** path 本体需要向内收缩的距离（未乘 strokeWidth） */
  shrink: number;
  /** auto boundary 端点为了避开空心箭头外缘需要额外内缩的距离 */
  boundaryOuterInset: number;
};

/** 物化端点箭头，并按重叠比例插值路径收缩量与边界外缘内缩量 */
export const emitEndpointArrowMark = (
  resolution: ArrowMarkResolution,
  endpointOverlap: number,
  round: (n: number) => number,
  resolvePaint: PaintResolver,
): EndpointArrowMarkEmission => {
  const { geometry } = resolution;
  const spec = emitArrowEnd(resolution, round, resolvePaint);
  // 将半线宽接缝重叠放在线接触点内侧，尖端的目标位置保持不变
  const contactWithOverlap = geometry.tipX - (geometry.shrink * geometry.baseSize) / geometry.resolvedLength;
  spec.refX += (contactWithOverlap - geometry.contactX) * (1 - endpointOverlap);
  if (endpointOverlap === 0) {
    return {
      spec,
      shrink: geometry.shrink,
      boundaryOuterInset: geometry.boundaryOuterInset,
    };
  }

  const fullEntryShrink = ((geometry.visualBackX - geometry.contactX) * geometry.resolvedLength) / geometry.baseSize;
  if (!Number.isFinite(fullEntryShrink)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Arrow '${resolution.visual.shape}' full-entry shrink is non-finite; use smaller back/contact/length/scale values.`,
    );
  }

  const endpointShrink = geometry.shrink + (fullEntryShrink - geometry.shrink) * endpointOverlap;
  if (!Number.isFinite(endpointShrink)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Arrow '${resolution.visual.shape}' endpoint-overlap shrink is non-finite; use smaller geometry values.`,
    );
  }

  return {
    spec,
    shrink: endpointShrink,
    boundaryOuterInset: geometry.boundaryOuterInset * (1 - endpointOverlap),
  };
};

/** 解析中段 arrow mark 为 marker 描述 */
export const emitMarkArrow = (
  resolution: ArrowMarkResolution,
  round: (n: number) => number,
  resolvePaint: PaintResolver,
): ResolvedArrowEnd => {
  return emitArrowEnd(resolution, round, resolvePaint);
};

/** 箭头收缩改写所需上下文 */
export type ApplyArrowShrinksContext = EndpointArrowSpecs & {
  /** 起点收缩系数，乘 strokeWidth 得到实际距离 */
  shrinkStart: number;
  /** 终点收缩系数，乘 strokeWidth 得到实际距离 */
  shrinkEnd: number;
  /** 宿主描边宽度 */
  strokeWidth: number;
  /** 坐标输出精度 */
  round: (n: number) => number;
};

/** 保留原曲线并计算端点箭头的接合位置与朝向 */
export const applyArrowShrinks = (
  commands: Array<PathCommand>,
  context: ApplyArrowShrinksContext,
): EndpointArrowSpecs => shortenEndpointContacts(commands, context);
