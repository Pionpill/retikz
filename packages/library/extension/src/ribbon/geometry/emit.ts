import type { IRGeometryLabel, PathCommand, PathKindCompileResult, PathKindLabel, ScenePrimitive } from '@retikz/core';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../../errors';
import type { RibbonCapDefinition } from '../cap-types';
import type { RibbonWidthProfileDefinition } from '../profile-types';
import { resolveRibbonOptions, resolveRibbonWidth } from '../resolve';
import type { IRRibbonPath } from '../types';
import {
  commandsToSegmentInputs,
  directionToSectionAxis,
  sampleAtDistance,
  segmentInputsToSegments,
} from './centerline';
import { endpointLabelInput } from './endpoint-label';
import { boundaryOutlineCommands, outlineCommands, ribbonCrossSection, styledPrimitiveFromOutline } from './outline';
import type { RibbonEmitOptions, RibbonLike, RibbonSegment } from './types';
import { widthFunction, resolveSampleCount } from './width';

/** ribbon path emit 所需的 Extension 编排上下文 */
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

type ResolvedRibbonLabel = Omit<IRGeometryLabel, 'textColor' | 'text'> & Pick<PathKindLabel, 'textColor' | 'text'>;

const canonicalizeLabel = (label: ResolvedRibbonLabel): PathKindLabel => ({
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
  const labels = (Array.isArray(path.label) ? path.label : [path.label]) as Array<ResolvedRibbonLabel>;
  return labels.map(canonicalizeLabel);
};

const materializedSamples = (
  segments: ReadonlyArray<RibbonSegment>,
  totalLength: number,
  labels: ReadonlyArray<PathKindLabel>,
  widthAt: (offset: number) => number,
  endpointAxes: { start?: [number, number]; end?: [number, number] },
  align: 'center' | 'left' | 'right',
  round: (value: number) => number,
): Array<Readonly<{ point: [number, number]; tangent: [number, number]; boundaryOffset?: number }>> =>
  labels.map(label => {
    const offset = Math.max(0, Math.min(1, label.position));
    const sample = sampleAtDistance(segments, totalLength, offset * totalLength);
    const section = ribbonCrossSection({
      sample,
      offset,
      widthAt,
      endpointAxes,
      align,
      round,
    });
    return {
      point: section.center,
      tangent: sample.tangent,
      boundaryOffset:
        label.side === 'bottom'
          ? align === 'left'
            ? 0
            : align === 'right'
              ? section.width
              : section.width / 2
          : align === 'right'
            ? 0
            : align === 'left'
              ? section.width
              : section.width / 2,
    };
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
 * IR ribbon path → Extension Path kind compile result
 * @description boundary 模式保留 upper/lower 两条曲线并闭合轮廓；centerline 模式复用 Core materializePath 的已结算 commands，再按宽度函数生成左右边界
 */
export const emitRibbonPrimitive = (
  path: IRRibbonPath,
  context: EmitRibbonPrimitiveContext,
  profileRegistry: ReadonlyMap<string, RibbonWidthProfileDefinition>,
  capRegistry: ReadonlyMap<string, RibbonCapDefinition>,
): PathKindCompileResult | null => {
  const options = resolveRibbonOptions(path.kindOptions);
  const ribbon: RibbonLike = { ...path, ...options };

  if (ribbon.mode === 'boundary') {
    if (path.label !== undefined) {
      throw new RetikzExtensionError({
        code: RetikzExtensionErrorCode.PipelineInvariant,
        message: 'Ribbon label first version only supports centerline ribbon labels.',
        details: { mode: ribbon.mode },
      });
    }
    const outline = boundaryOutlineCommands({
      upper: context.materializePath({ children: ribbon.upper }).commands,
      lower: context.materializePath({ children: ribbon.lower }).commands,
    });
    return resultOf(ribbon, outline, context);
  }

  if (ribbon.children === undefined) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.PipelineInvariant,
      message: 'Centerline ribbon requires `children`.',
      details: { mode: ribbon.mode },
    });
  }
  const materialized = context.materializePath({ children: ribbon.children });
  const segmentInputs = commandsToSegmentInputs(materialized.commands, 'centerline');
  const rawSegments = segmentInputsToSegments(segmentInputs);
  const rawTotalLength = rawSegments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(rawTotalLength) || rawTotalLength <= 0) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
      message: 'Ribbon centerline has zero length; at least one nonzero segment is required.',
      details: { totalLength: rawTotalLength },
    });
  }
  const endpointAxes = {
    start: ribbon.start.direction === 'auto' ? undefined : directionToSectionAxis(ribbon.start.direction, 'start'),
    end: ribbon.end.direction === 'auto' ? undefined : directionToSectionAxis(ribbon.end.direction, 'end'),
  };
  const segments = rawSegments;
  const totalLength = rawTotalLength;
  const widthResolution = resolveRibbonWidth(ribbon.width, profileRegistry, 'path.kindOptions.width');
  const widthAt = widthFunction(widthResolution, totalLength);
  const sampleCount = resolveSampleCount(ribbon.sampling, totalLength);
  const stops = ribbon.width.kind === 'stops' ? ribbon.width.stops : [];
  const outline = outlineCommands({
    segments,
    totalLength,
    sampleCount,
    widthAt,
    endpointAxes,
    align: ribbon.align,
    startEndpointCap: ribbon.start.cap,
    endEndpointCap: ribbon.end.cap,
    capRegistry,
    featureOffsets: stops.map(stop => stop.offset),
    jumpOffsets:
      ribbon.width.kind === 'stops' && ribbon.width.interpolation === 'step' ? stops.map(stop => stop.offset) : [],
    round: context.round,
  });

  const labels = labelsOf(path);
  const samples = materializedSamples(
    segments,
    totalLength,
    labels,
    widthAt,
    endpointAxes,
    ribbon.align,
    context.round,
  );
  const result = resultOf(ribbon, outline, context, labels, samples);
  const endpointLabels = context.emitBoundaryLabels([
    ...endpointLabelInput('start', ribbon.start, outline.start),
    ...endpointLabelInput('end', ribbon.end, outline.end),
  ]);
  return { ...result, primitives: [...result.primitives, ...endpointLabels] };
};
