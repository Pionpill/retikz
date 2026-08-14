import type { ScenePrimitive } from '../../../contract';
import type { PathTargetView, RibbonPathResolution } from '../../../resolve/path';
import type { IRPosition } from '../../../schemas';
import type { PaintResolver } from '../../resource';
import type { TextMeasurer } from '../../text';
import type { PathPrimitiveEmitResult } from '../types';
import type { RibbonEmitOptions, RibbonLike } from './types';

import { emitLabelPrimitive } from '../host';
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

/** ribbon path emit 所需的编译上下文 */
export type EmitRibbonPrimitiveContext = {
  /** resolving 阶段绑定的 target view */
  targetView: PathTargetView;
  /** 坐标取整函数 */
  round: (n: number) => number;
  /** 文本测量函数 */
  measureText: TextMeasurer;
  /** ribbon emit 选项 */
  options?: RibbonEmitOptions;
};

/**
 * IR ribbon path → Scene primitive
 * @description boundary 模式把 upper/lower 两条 path 采样成闭合轮廓；centerline 模式复用普通 path emit 解析中心线，再按宽度函数生成左右边界。静态宽度优先走 analyticOutlineCommands，必要时回退采样轮廓
 */
export const emitRibbonPrimitive = (
  resolution: RibbonPathResolution,
  context: EmitRibbonPrimitiveContext,
): PathPrimitiveEmitResult | null => {
  const { targetView, round, measureText, options = {} } = context;
  const { path: canonicalPath } = resolution;
  if (canonicalPath.ribbon === undefined) {
    throw new Error('Ribbon path requires a `ribbon` options object.');
  }
  const { ribbon: ribbonOptions, ...canonicalBase } = canonicalPath;
  const ribbon: RibbonLike = { ...canonicalBase, ...ribbonOptions };
  const resolvePaint: PaintResolver =
    options.resolvePaint ?? (p => (typeof p === 'string' || p === undefined ? p : undefined));
  if (ribbon.mode === 'boundary') {
    // boundary 模式的 upper / lower 是两条真实边界线，不再计算宽度；采样数按较长边界线决定
    if (ribbon.label !== undefined) {
      throw new Error('Ribbon label first version only supports centerline ribbon labels.');
    }
    if (ribbon.upper === undefined || ribbon.lower === undefined) {
      throw new Error('Boundary ribbon requires `upper` and `lower` steps.');
    }
    const upper = segmentsFromSteps({
      steps: ribbon.upper,
      source: 'upper boundary',
      resolution,
      targetView,
      round,
      measureText,
      options,
    });
    const lower = segmentsFromSteps({
      steps: ribbon.lower,
      source: 'lower boundary',
      resolution,
      targetView,
      round,
      measureText,
      options,
    });
    const samples = assertSampleCount(
      resolveSampleCount(ribbon.sampling, Math.max(upper.totalLength, lower.totalLength)) ?? DEFAULT_RIBBON_SAMPLES,
    );
    const outline = boundaryOutlineCommands({
      upper: upper.segments,
      upperLength: upper.totalLength,
      lower: lower.segments,
      lowerLength: lower.totalLength,
      sampleCount: samples,
      round,
    });
    return {
      primitives: [styledPrimitiveFromOutline(ribbon, outline, resolvePaint)],
      boundsPoints: outline.points,
    };
  }

  if (ribbon.children === undefined) {
    throw new Error('Centerline ribbon requires `children`.');
  }
  // centerline 模式先降成普通 PathPrim，再把 commands 转成 ribbon 自己的 segment 输入
  const segmentInputs = commandsToSegmentInputs(
    emittedPathFromSteps({
      steps: ribbon.children,
      source: 'centerline',
      resolution,
      targetView,
      round,
      measureText,
      options,
    }).commands,
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
    start: directionToTangent(ribbon.start.direction, connectionTangent, 'start'),
    end: directionToTangent(ribbon.end.direction, connectionTangent, 'end'),
  };
  // 若端点显式给 direction，重建首尾段采样器，让横截面在端点处服从该方向
  const segments = segmentInputsToSegments(segmentInputs, {
    start: ribbon.start.direction === undefined ? undefined : endpointTangents.start,
    end: ribbon.end.direction === undefined ? undefined : endpointTangents.end,
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    throw new Error('Ribbon centerline has zero length; at least one nonzero segment is required.');
  }
  const widthAt = centerlineWidthFunction(ribbon, resolution.ribbonWidth, totalLength);
  const samples = resolveSampleCount(ribbon.sampling, totalLength);
  const sampleCount =
    samples ?? (centerlineWidthRequiresSampling(resolution.ribbonWidth) ? DEFAULT_RIBBON_SAMPLES : undefined);
  // 静态宽度优先解析型轮廓，必要时回退采样
  const outline =
    sampleCount === undefined
      ? (analyticOutlineCommands({
          inputs: segmentInputs,
          segments,
          totalLength,
          widthAt,
          endpointTangents,
          endpointTangentOverrides: {
            start: ribbon.start.direction === undefined ? undefined : endpointTangents.start,
            end: ribbon.end.direction === undefined ? undefined : endpointTangents.end,
          },
          align: ribbon.align,
          startEndpointCap: ribbon.start.cap,
          endEndpointCap: ribbon.end.cap,
          targetView,
          scopeChain: options.scopeChain,
          round,
        }) ??
        outlineCommands({
          segments,
          totalLength,
          sampleCount: DEFAULT_RIBBON_SAMPLES,
          widthAt,
          endpointTangents,
          align: ribbon.align,
          startEndpointCap: ribbon.start.cap,
          endEndpointCap: ribbon.end.cap,
          targetView,
          scopeChain: options.scopeChain,
          round,
        }))
      : outlineCommands({
          segments,
          totalLength,
          sampleCount: assertSampleCount(sampleCount),
          widthAt,
          endpointTangents,
          align: ribbon.align,
          startEndpointCap: ribbon.start.cap,
          endEndpointCap: ribbon.end.cap,
          targetView,
          scopeChain: options.scopeChain,
          round,
        });

  const labelPrimitives: Array<ScenePrimitive> = [];
  const labelBoundsPoints: Array<IRPosition> = [];
  for (const label of ribbon.label ?? []) {
    // ribbon label 以中心线采样点为锚点，boundaryOffset 用当前宽度的一半把 outside/inside 放到带状区域边缘
    const t = label.position;
    const sample = sampleAtDistance(segments, totalLength, t * totalLength);
    const offset = t * totalLength;
    const normalizedOffset = totalLength === 0 ? 0 : offset / totalLength;
    const section = ribbonCrossSection({
      sample,
      offset: normalizedOffset,
      widthAt,
      endpointTangents,
      align: ribbon.align,
      round,
    });
    const result = emitLabelPrimitive(label, sample, {
      measureText,
      round,
      rootFontSize: options.rootFontSize,
      hostOpacity: ribbon.opacity,
      tex: {
        lowerTex: options.lowerTex,
        gatingOn: options.lowerTex !== undefined,
        warn: (code, message) => options.onWarn?.({ code, message, path: `${options.irPath ?? 'ribbon'}.label` }),
      },
      placement: { boundaryOffset: section.width / 2 },
    });
    labelPrimitives.push(result.primitive);
    labelBoundsPoints.push(...result.boundsPoints);
  }

  return {
    primitives: [styledPrimitiveFromOutline(ribbon, outline, resolvePaint), ...labelPrimitives],
    boundsPoints: [...outline.points, ...labelBoundsPoints],
  };
};
