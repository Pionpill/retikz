import type { ScenePrimitive } from '../../../contract';
import type { IRPathBase, IRPosition } from '../../../schemas';
import type { NameStack } from '../../name-stack';
import type { PaintResolver } from '../../resource';
import type { TextMeasurer } from '../../text';
import type { RibbonEmitOptions, RibbonLike } from './types';

import { emitLabelPrimitive, tForLabelPosition } from '../label';
import {
  commandsToSegmentInputs,
  directionToTangent,
  emittedPathFromSteps,
  normalizeVector,
  sampleAtDistance,
  segmentInputsToSegments,
  segmentsFromSteps,
} from './centerline';
import {
  analyticOutlineCommands,
  boundaryOutlineCommands,
  outlineCommands,
  ribbonCrossSection,
  styledPrimitiveFromOutline,
} from './outline';
import { DEFAULT_RIBBON_SAMPLES } from './types';
import {
  assertSampleCount,
  centerlineWidthFunction,
  centerlineWidthRequiresSampling,
  resolveSampleCount,
} from './width';

/**
 * IR ribbon path → Scene primitive
 * @description boundary 模式把 upper/lower 两条 path 采样成闭合轮廓；centerline 模式先复用普通 path emit 解析中心线，
 *   再按宽度函数生成左右边界。静态宽度 + 解析型线段优先走 analyticOutlineCommands；无法解析或用户要求采样时走采样轮廓。
 */
export const emitRibbonPrimitive = (
  path: IRPathBase,
  nameStack: NameStack,
  round: (n: number) => number,
  measureText: TextMeasurer,
  options: RibbonEmitOptions = {},
): { primitives: Array<ScenePrimitive>; points: Array<IRPosition> } | null => {
  if (path.ribbon === undefined) {
    throw new Error('Ribbon path requires a `ribbon` options object.');
  }
  const ribbon: RibbonLike = { ...path, ...path.ribbon };
  const resolvePaint: PaintResolver =
    options.resolvePaint ?? (p => (typeof p === 'string' || p === undefined ? p : undefined));
  if (ribbon.mode === 'boundary') {
    // boundary 模式的 upper / lower 是两条真实边界线，不再计算宽度；采样数按较长边界线决定。
    if (ribbon.label !== undefined) {
      throw new Error('Ribbon label first version only supports centerline ribbon labels.');
    }
    if (ribbon.upper === undefined || ribbon.lower === undefined) {
      throw new Error('Boundary ribbon requires `upper` and `lower` steps.');
    }
    const upper = segmentsFromSteps(ribbon.upper, 'upper boundary', nameStack, round, measureText, options);
    const lower = segmentsFromSteps(ribbon.lower, 'lower boundary', nameStack, round, measureText, options);
    const samples = assertSampleCount(
      resolveSampleCount(ribbon.samples, ribbon.sampling, Math.max(upper.totalLength, lower.totalLength)) ??
        DEFAULT_RIBBON_SAMPLES,
    );
    const outline = boundaryOutlineCommands(
      upper.segments,
      upper.totalLength,
      lower.segments,
      lower.totalLength,
      samples,
      round,
    );
    return {
      primitives: [styledPrimitiveFromOutline(ribbon, outline, resolvePaint)],
      points: outline.points,
    };
  }

  if (ribbon.children === undefined) {
    throw new Error('Centerline ribbon requires `children`.');
  }
  // centerline 模式先降成普通 PathPrim，再把 commands 转成 ribbon 自己的 segment 输入。
  const segmentInputs = commandsToSegmentInputs(
    emittedPathFromSteps(ribbon.children, 'centerline', nameStack, round, measureText, options).commands,
    'centerline',
  );
  const rawSegments = segmentInputsToSegments(segmentInputs);
  const rawTotalLength = rawSegments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(rawTotalLength) || rawTotalLength <= 0) {
    throw new Error('Ribbon centerline has zero length; at least one nonzero segment is required.');
  }
  const startPoint = sampleAtDistance(rawSegments, rawTotalLength, 0).point;
  const endPoint = sampleAtDistance(rawSegments, rawTotalLength, rawTotalLength).point;
  const connectionTangent = normalizeVector([endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]], 'connection');
  const endpointTangents = {
    start: directionToTangent(ribbon.start?.direction, connectionTangent, 'start'),
    end: directionToTangent(ribbon.end?.direction, connectionTangent, 'end'),
  };
  // 若端点显式给 direction，重建首尾段采样器，让横截面在端点处服从该方向。
  const segments = segmentInputsToSegments(segmentInputs, {
    start: ribbon.start?.direction === undefined ? undefined : endpointTangents.start,
    end: ribbon.end?.direction === undefined ? undefined : endpointTangents.end,
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    throw new Error('Ribbon centerline has zero length; at least one nonzero segment is required.');
  }
  const widthAt = centerlineWidthFunction(ribbon, options.ribbonWidthProfiles ?? new Map(), totalLength);
  const samples = resolveSampleCount(ribbon.samples, ribbon.sampling, totalLength);
  const sampleCount = samples ?? (centerlineWidthRequiresSampling(ribbon) ? DEFAULT_RIBBON_SAMPLES : undefined);
  // 静态宽度优先解析型轮廓，必要时回退采样。
  const outline =
    sampleCount === undefined
      ? (analyticOutlineCommands(
          segmentInputs,
          segments,
          totalLength,
          widthAt,
          endpointTangents,
          {
            start: ribbon.start?.direction === undefined ? undefined : endpointTangents.start,
            end: ribbon.end?.direction === undefined ? undefined : endpointTangents.end,
          },
          ribbon.align ?? 'center',
          ribbon.start?.cap ?? 'butt',
          ribbon.end?.cap ?? 'butt',
          nameStack,
          round,
        ) ??
        outlineCommands(
          segments,
          totalLength,
          DEFAULT_RIBBON_SAMPLES,
          widthAt,
          endpointTangents,
          ribbon.align ?? 'center',
          ribbon.start?.cap ?? 'butt',
          ribbon.end?.cap ?? 'butt',
          nameStack,
          round,
        ))
      : outlineCommands(
          segments,
          totalLength,
          assertSampleCount(sampleCount),
          widthAt,
          endpointTangents,
          ribbon.align ?? 'center',
          ribbon.start?.cap ?? 'butt',
          ribbon.end?.cap ?? 'butt',
          nameStack,
          round,
        );

  const labelPrimitives: Array<ScenePrimitive> = [];
  const labelPoints: Array<IRPosition> = [];
  const labels = ribbon.label === undefined ? [] : Array.isArray(ribbon.label) ? ribbon.label : [ribbon.label];
  for (const label of labels) {
    // ribbon label 以中心线采样点为锚点，boundaryOffset 用当前宽度的一半把 outside/inside 放到带状区域边缘。
    const t = tForLabelPosition(label.position);
    const sample = sampleAtDistance(segments, totalLength, t * totalLength);
    const offset = t * totalLength;
    const normalizedOffset = totalLength === 0 ? 0 : offset / totalLength;
    const section = ribbonCrossSection(
      sample,
      normalizedOffset,
      widthAt,
      endpointTangents,
      ribbon.align ?? 'center',
      round,
    );
    const result = emitLabelPrimitive(
      label,
      sample,
      measureText,
      round,
      ribbon.opacity,
      {
        lowerTex: options.lowerTex,
        gatingOn: options.lowerTex !== undefined,
        warn: (code, message) => options.onWarn?.({ code, message, path: `${options.irPath ?? 'ribbon'}.label` }),
      },
      { boundaryOffset: section.width / 2 },
    );
    labelPrimitives.push(result.primitive);
    labelPoints.push(...result.points);
  }

  return {
    primitives: [styledPrimitiveFromOutline(ribbon, outline, resolvePaint), ...labelPrimitives],
    points: [...outline.points, ...labelPoints],
  };
};
