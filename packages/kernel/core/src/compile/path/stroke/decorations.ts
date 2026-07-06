import type { PathCommand, ResolvedArrowEndSpec, ScenePrimitive } from '../../../contract';
import type { IRPathBase, IRPosition } from '../../../schemas';
import type { SegmentSample } from '../../../shared/geometry';
import type { ResolvedPathBaseProps } from '../host';
import type { PathPrimitiveEmitResult } from '../types';
import type { ResolvedArrowRegistry } from './shrink';

import { buildMarkMarkerGroup, markerContextStroke } from './marks';
import { sampleRoundedCommands } from './rounded-corners';
import { emitEndpointArrowMark, emitMarkArrowSpec } from './shrink';

/** 端点箭头与中段 marks 分流结果。 */
export type ResolvedPathEndpointDecorations = {
  /** 起点 / 终点箭头规格与 shrink 信息。 */
  arrows: {
    arrowStart?: ResolvedArrowEndSpec;
    arrowEnd?: ResolvedArrowEndSpec;
    shrinkStart: number;
    shrinkEnd: number;
    boundaryOuterInsetStart: number;
    boundaryOuterInsetEnd: number;
  };
  /** 非端点 marks，稍后按 path 采样点 emit 成 Scene primitive。 */
  inlineMarks: NonNullable<IRPathBase['marks']>;
};

/** path 端点 mark 解析输入。 */
export type ResolvePathEndpointDecorationsContext = {
  /** 已解析 arrow registry。 */
  resolvedArrows: ResolvedArrowRegistry;
  /** 坐标取整函数。 */
  round: (n: number) => number;
};

/**
 * 将 `path.marks` 分流为端点箭头与中段 marks。
 * @description pos=0 / pos=1 的首个 mark 会成为端点箭头；其余 mark 保持为 inline mark。
 */
export const resolvePathEndpointDecorations = (
  path: IRPathBase,
  context: ResolvePathEndpointDecorationsContext,
): ResolvedPathEndpointDecorations => {
  const { resolvedArrows, round } = context;
  const arrows: ResolvedPathEndpointDecorations['arrows'] = {
    shrinkStart: 0,
    shrinkEnd: 0,
    boundaryOuterInsetStart: 0,
    boundaryOuterInsetEnd: 0,
  };
  const inlineMarks: NonNullable<IRPathBase['marks']> = [];
  for (const item of path.marks ?? []) {
    if (item.pos === 0 && arrows.arrowStart === undefined) {
      const resolved = emitEndpointArrowMark(item.mark, resolvedArrows, round);
      arrows.arrowStart = resolved.spec;
      arrows.shrinkStart = resolved.shrink;
      arrows.boundaryOuterInsetStart = resolved.boundaryOuterInset;
      continue;
    }
    if (item.pos === 1 && arrows.arrowEnd === undefined) {
      const resolved = emitEndpointArrowMark(item.mark, resolvedArrows, round);
      arrows.arrowEnd = resolved.spec;
      arrows.shrinkEnd = resolved.shrink;
      arrows.boundaryOuterInsetEnd = resolved.boundaryOuterInset;
      continue;
    }
    inlineMarks.push(item);
  }
  return { arrows, inlineMarks };
};

/** 中段 mark emit 输入。 */
export type EmitInlineMarkPrimitivesInput = {
  /** path commands；倒角后 mark 采样需要读取最终 commands。 */
  commands: Array<PathCommand>;
  /** 非端点 marks。 */
  inlineMarks: NonNullable<IRPathBase['marks']>;
  /** 每段几何采样器。 */
  segmentSamplers: Array<(t: number) => SegmentSample>;
  /** commands 是否已经被 roundedCorners 改写。 */
  roundedCommands: boolean;
  /** 已解析 arrow registry。 */
  resolvedArrows: ResolvedArrowRegistry;
  /** PathPrim 公共样式属性。 */
  baseProps: ResolvedPathBaseProps;
  /** 坐标取整函数。 */
  round: (n: number) => number;
};

/**
 * 将中段 marks 编译成按切线定向的 marker group。
 * @description 未倒角时保持原有按段数均分采样；倒角后按最终 commands 总弧长采样。
 */
export const emitInlineMarkPrimitives = ({
  commands,
  inlineMarks,
  segmentSamplers,
  roundedCommands,
  resolvedArrows,
  baseProps,
  round,
}: EmitInlineMarkPrimitivesInput): PathPrimitiveEmitResult => {
  const primitives: Array<ScenePrimitive> = [];
  const boundsPoints: Array<IRPosition> = [];
  if (inlineMarks.length === 0 || segmentSamplers.length === 0) {
    return { primitives, boundsPoints };
  }

  const strokeWidth = baseProps.strokeWidth;
  const segCount = segmentSamplers.length;
  for (const { pos, mark } of inlineMarks) {
    const sample = roundedCommands
      ? sampleRoundedCommands(commands, pos)
      : (() => {
          const scaled = pos * segCount;
          const segIdx = Math.min(Math.floor(scaled), segCount - 1);
          const localT = scaled - segIdx;
          return segmentSamplers[segIdx](pos === 1 ? 1 : localT);
        })();
    const spec = emitMarkArrowSpec(mark, resolvedArrows, round);
    primitives.push(
      buildMarkMarkerGroup(spec, sample, {
        strokeWidth,
        round,
        contextStroke: markerContextStroke(baseProps.stroke),
      }),
    );
    boundsPoints.push(sample.point);
  }
  return { primitives, boundsPoints };
};

/** 端点箭头字段：无箭头时不写 undefined key，保持 Scene 输出纯净。 */
export const pathEndpointArrowSpecs = (
  arrows: ResolvedPathEndpointDecorations['arrows'],
): { arrowStart?: ResolvedArrowEndSpec; arrowEnd?: ResolvedArrowEndSpec } => {
  const endpointSpecs: { arrowStart?: ResolvedArrowEndSpec; arrowEnd?: ResolvedArrowEndSpec } = {};
  if (arrows.arrowStart) endpointSpecs.arrowStart = arrows.arrowStart;
  if (arrows.arrowEnd) endpointSpecs.arrowEnd = arrows.arrowEnd;
  return endpointSpecs;
};
