import type { IRGeometryLabel, PathCommand, PathKindCompileResult, PathKindLabel, ScenePrimitive } from '@retikz/core';

import type { RibbonWidthProfileDefinition } from '../profile-types';
import type { IRRibbonPath } from '../types';
import type { RibbonEmitOptions, RibbonLike, RibbonSegment } from './types';

import { RetikzStandardError, RetikzStandardErrorCode } from '../../errors';
import { resolveRibbonOptions, resolveRibbonWidth } from '../resolve';
import {
  commandsToSegmentInputs,
  directionToTangent,
  normalizeVector,
  sampleAtDistance,
  segmentInputsToSegments,
  segmentsFromCommands,
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

/** ribbon path emit 所需的 Standard 编排上下文 */
export type EmitRibbonPrimitiveContext = RibbonEmitOptions;

const LABEL_POSITION: Record<string, number> = {
  'at-start': 0,
  'very-near-start': 0.125,
  'near-start': 0.25,
  midway: 0.5,
  'near-end': 0.75,
  'very-near-end': 0.875,
  'at-end': 1,
};

const canonicalizeLabel = (label: IRGeometryLabel): PathKindLabel => ({
  ...label,
  position:
    label.position === undefined
      ? 0.5
      : typeof label.position === 'number'
        ? label.position
        : (LABEL_POSITION[label.position] ?? 0.5),
  side: label.side ?? (label.sloped === true || label.placement === 'inside' ? 'center' : 'top'),
  distance: label.distance ?? 4,
});

const labelsOf = (path: IRRibbonPath): Array<PathKindLabel> => {
  if (path.label === undefined) return [];
  return (Array.isArray(path.label) ? path.label : [path.label]).map(canonicalizeLabel);
};

const materializedSamples = (
  segments: ReadonlyArray<RibbonSegment>,
  totalLength: number,
  labels: ReadonlyArray<PathKindLabel>,
  widthAt: (offset: number) => number,
  endpointTangents: { start: [number, number]; end: [number, number] },
  align: RibbonLike['align'],
  round: (value: number) => number,
): Array<Readonly<{ point: [number, number]; tangent: [number, number]; boundaryOffset?: number }>> =>
  labels.map(label => {
    const offset = Math.max(0, Math.min(1, label.position));
    const sample = sampleAtDistance(segments, totalLength, offset * totalLength);
    const section = ribbonCrossSection({
      sample,
      offset,
      widthAt,
      endpointTangents,
      align,
      round,
    });
    return { point: section.center, tangent: section.tangent, boundaryOffset: section.width / 2 };
  });

const resultOf = (
  ribbon: RibbonLike,
  outline: { commands: Array<PathCommand>; points: Array<[number, number]> },
  context: EmitRibbonPrimitiveContext,
  labels: ReadonlyArray<PathKindLabel> = [],
  samples: ReadonlyArray<
    Readonly<{ point: [number, number]; tangent: [number, number]; boundaryOffset?: number }>
  > = [],
): PathKindCompileResult => {
  const labelPrimitives: ReadonlyArray<ScenePrimitive> =
    labels.length === 0 ? [] : context.emitHostLabels({ labels, samples });
  return {
    primitives: [styledPrimitiveFromOutline(ribbon, outline, context.appearance), ...labelPrimitives],
    boundsPoints: [...outline.points, ...samples.map(sample => sample.point)],
  };
};

/**
 * IR ribbon path → Standard Path kind compile result
 * @description boundary 模式把 upper/lower 两条 path 采样成闭合轮廓；centerline 模式复用 Core materializePath 的已结算 commands，再按宽度函数生成左右边界
 */
export const emitRibbonPrimitive = (
  path: IRRibbonPath,
  context: EmitRibbonPrimitiveContext,
  profileRegistry: ReadonlyMap<string, RibbonWidthProfileDefinition>,
): PathKindCompileResult | null => {
  const options = resolveRibbonOptions(path.kindOptions);
  const ribbon: RibbonLike = { ...path, ...options };

  if (ribbon.mode === 'boundary') {
    if (path.label !== undefined) {
      throw new RetikzStandardError({
        code: RetikzStandardErrorCode.PipelineInvariant,
        message: 'Ribbon label first version only supports centerline ribbon labels.',
        details: { mode: ribbon.mode },
      });
    }
    if (ribbon.upper === undefined || ribbon.lower === undefined) {
      throw new RetikzStandardError({
        code: RetikzStandardErrorCode.PipelineInvariant,
        message: 'Boundary ribbon requires `upper` and `lower` steps.',
        details: { mode: ribbon.mode, upper: ribbon.upper !== undefined, lower: ribbon.lower !== undefined },
      });
    }
    const upper = segmentsFromCommands({
      commands: context.materializePath({ children: ribbon.upper }).commands,
      source: 'upper boundary',
    });
    const lower = segmentsFromCommands({
      commands: context.materializePath({ children: ribbon.lower }).commands,
      source: 'lower boundary',
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
      round: context.round,
    });
    return resultOf(ribbon, outline, context);
  }

  if (ribbon.children === undefined) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.PipelineInvariant,
      message: 'Centerline ribbon requires `children`.',
      details: { mode: ribbon.mode },
    });
  }
  const materialized = context.materializePath({ children: ribbon.children });
  const segmentInputs = commandsToSegmentInputs(materialized.commands, 'centerline');
  const rawSegments = segmentInputsToSegments(segmentInputs);
  const rawTotalLength = rawSegments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(rawTotalLength) || rawTotalLength <= 0) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.GeometryInvalid,
      message: 'Ribbon centerline has zero length; at least one nonzero segment is required.',
      details: { totalLength: rawTotalLength },
    });
  }
  const startPoint = sampleAtDistance(rawSegments, rawTotalLength, 0).point;
  const endPoint = sampleAtDistance(rawSegments, rawTotalLength, rawTotalLength).point;
  const connectionTangent = normalizeVector([endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]], 'connection');
  const endpointTangents = {
    start: directionToTangent(ribbon.start.direction, connectionTangent, 'start'),
    end: directionToTangent(ribbon.end.direction, connectionTangent, 'end'),
  };
  const segments = segmentInputsToSegments(segmentInputs, {
    start: ribbon.start.direction === undefined ? undefined : endpointTangents.start,
    end: ribbon.end.direction === undefined ? undefined : endpointTangents.end,
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.GeometryInvalid,
      message: 'Ribbon centerline has zero length; at least one nonzero segment is required.',
      details: { totalLength },
    });
  }
  const widthResolution = resolveRibbonWidth(ribbon.width, profileRegistry, 'path.kindOptions.width');
  const widthAt = centerlineWidthFunction(ribbon, widthResolution, totalLength);
  const sampleCount = resolveSampleCount(ribbon.sampling, totalLength);
  const resolvedSampleCount =
    sampleCount ?? (centerlineWidthRequiresSampling(widthResolution) ? DEFAULT_RIBBON_SAMPLES : undefined);
  const outline =
    resolvedSampleCount === undefined
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
          round: context.round,
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
          round: context.round,
        }))
      : outlineCommands({
          segments,
          totalLength,
          sampleCount: assertSampleCount(resolvedSampleCount),
          widthAt,
          endpointTangents,
          align: ribbon.align,
          startEndpointCap: ribbon.start.cap,
          endEndpointCap: ribbon.end.cap,
          round: context.round,
        });

  const labels = labelsOf(path);
  const samples = materializedSamples(
    segments,
    totalLength,
    labels,
    widthAt,
    endpointTangents,
    ribbon.align,
    context.round,
  );
  return resultOf(ribbon, outline, context, labels, samples);
};
