import { type Vector2, polar, vector2 } from '../../geometry';
import type { PathCommand, PathPrim, ScenePrimitive } from '../../primitive';
import type {
  IRPath,
  IRPathBase,
  IRPathRibbonOptions,
  IRPosition,
  IRRibbonArcCap,
  IRRibbonCap,
  IRRibbonDirection,
  IRRibbonSampling,
  IRRibbonWidth,
  IRStep,
  RibbonAlignmentValue,
} from '../../schemas';
import { JsonObjectSchema } from '../../schemas';
import type { RibbonWidthProfileDefinition } from '../../contract/ribbon';
import type { NameStack } from '../name-stack';
import type { TextMeasurer } from '../text-metrics';
import type { PaintResolver } from '../paint';
import { type EmitPathWarnHook, emitPathPrimitive } from '.';
import { emitLabelPrimitive, tForLabelPosition } from './label';
import {
  type SegmentSample,
  arcSegmentSample,
  cubicSegmentSample,
  ellipseArcSegmentSample,
  lineSegmentSample,
  quadSegmentSample,
} from '../../geometry/segment';
import { resolveShadow } from '../effects';
import { resolvePosition } from '../position';

type RibbonLike = Omit<IRPathBase, 'kind' | 'kindOptions' | 'ribbon'> & IRPathRibbonOptions;

const DEFAULT_RIBBON_SAMPLES = 64;
const LENGTH_SUBDIVISIONS = 16;
const ENDPOINT_DIRECTION_BLEND_SPAN = 0.18;
const ARC_CAP_POINT_COUNT = 8;

type RibbonSegment = {
  sampleAt: (t: number) => SegmentSample;
  length: number;
};

type RibbonSegmentInput =
  | { kind: 'line'; from: IRPosition; to: IRPosition }
  | { kind: 'quad'; from: IRPosition; control: IRPosition; to: IRPosition }
  | {
      kind: 'cubic';
      from: IRPosition;
      control1: IRPosition;
      control2: IRPosition;
      to: IRPosition;
    }
  | {
      kind: 'arc';
      center: IRPosition;
      radius: number;
      startAngle: number;
      endAngle: number;
      to: IRPosition;
    }
  | {
      kind: 'ellipseArc';
      center: IRPosition;
      radiusX: number;
      radiusY: number;
      startAngle: number;
      endAngle: number;
      to: IRPosition;
    };

type RibbonAnalyticSegment =
  | { kind: 'line'; from: IRPosition; to: IRPosition }
  | { kind: 'quad'; from: IRPosition; control: IRPosition; to: IRPosition }
  | {
      kind: 'cubic';
      from: IRPosition;
      control1: IRPosition;
      control2: IRPosition;
      to: IRPosition;
    };

type RibbonCrossSection = {
  center: IRPosition;
  left: IRPosition;
  right: IRPosition;
  tangent: Vector2;
  width: number;
};

type RibbonEmitOptions = EmitPathWarnHook & {
  ribbonWidthProfiles?: Partial<Record<string, RibbonWidthProfileDefinition>>;
};

const stripStepLabel = (step: IRStep): IRStep => {
  const next = { ...step } as IRStep;
  if ('label' in next) delete next.label;
  return next;
};

const isPathPrim = (prim: ScenePrimitive): prim is PathPrim => prim.type === 'path';

const assertCursor = (
  cursor: IRPosition | undefined,
  command: PathCommand,
): IRPosition => {
  if (cursor !== undefined) return cursor;
  throw new Error(
    `Ribbon centerline command "${command.kind}" has no current point; start with a move step.`,
  );
};

const distance = (a: IRPosition, b: IRPosition): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy);
};

const pointOnDirection = (
  origin: IRPosition,
  direction: Vector2,
  length: number,
): IRPosition => [origin[0] + direction[0] * length, origin[1] + direction[1] * length];

const pointAgainstDirection = (
  origin: IRPosition,
  direction: Vector2,
  length: number,
): IRPosition => [origin[0] - direction[0] * length, origin[1] - direction[1] * length];

const normalizeVector = (vector: Vector2, source: string): Vector2 => {
  const length = Math.hypot(vector[0], vector[1]);
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error(`Ribbon ${source} direction must be a finite nonzero vector.`);
  }
  return [vector[0] / length, vector[1] / length];
};

const normalOf = (tangent: Vector2): Vector2 => [-tangent[1], tangent[0]];

const alignTangentNormal = (tangent: Vector2, reference: Vector2): Vector2 => {
  const normal = normalOf(tangent);
  const referenceNormal = normalOf(reference);
  return normal[0] * referenceNormal[0] + normal[1] * referenceNormal[1] < 0
    ? [-tangent[0], -tangent[1]]
    : tangent;
};

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

const blendTangent = (
  endpointTangent: Vector2,
  sampleTangent: Vector2,
  t: number,
  source: string,
): Vector2 => {
  const u = smoothstep(Math.max(0, Math.min(1, t)));
  return normalizeVector(
    [
      endpointTangent[0] + (sampleTangent[0] - endpointTangent[0]) * u,
      endpointTangent[1] + (sampleTangent[1] - endpointTangent[1]) * u,
    ],
    source,
  );
};

const directionToTangent = (
  direction: IRRibbonDirection | undefined,
  fallback: Vector2,
  source: string,
): Vector2 => {
  if (direction === undefined) return fallback;
  if (typeof direction === 'number') {
    return vector2.fromAngleDegrees(direction);
  }
  if (Array.isArray(direction)) {
    return normalizeVector(vector2.fromPosition(direction), source);
  }
  try {
    return normalizeVector(polar.toPosition(direction), source);
  } catch {
    throw new Error(
      `Ribbon ${source} direction PolarPosition cannot use a string origin; use an angle or explicit vector instead.`,
    );
  }
};

const estimateLength = (sampleAt: (t: number) => SegmentSample): number => {
  let total = 0;
  let prev = sampleAt(0).point;
  for (let i = 1; i <= LENGTH_SUBDIVISIONS; i += 1) {
    const curr = sampleAt(i / LENGTH_SUBDIVISIONS).point;
    total += distance(prev, curr);
    prev = curr;
  }
  return total;
};

const finitePoint = (p: IRPosition): boolean =>
  Number.isFinite(p[0]) && Number.isFinite(p[1]);

const assertFiniteWidth = (width: number, source: string): number => {
  if (!Number.isFinite(width) || width < 0) {
    throw new Error(
      `Ribbon width ${source} produced ${String(width)}; width must be a finite nonnegative number.`,
    );
  }
  return width;
};

const interpolate = (
  a: number,
  b: number,
  t: number,
  mode: 'linear' | 'smooth' | 'step',
): number => {
  if (mode === 'step') return a;
  const u = mode === 'smooth' ? smoothstep(t) : t;
  return a + (b - a) * u;
};

const widthFunction = (
  width: IRRibbonWidth,
  profiles: Partial<Record<string, RibbonWidthProfileDefinition>>,
  totalLength: number,
): ((offset: number) => number) => {
  if (typeof width === 'number') {
    return () => assertFiniteWidth(width, 'number');
  }

  if (width.kind === 'stops') {
    const stops = [...width.stops].sort((a, b) => a.offset - b.offset);
    const mode = width.interpolation ?? 'linear';
    return offset => {
      if (offset <= stops[0].offset) return assertFiniteWidth(stops[0].value, 'first stop');
      for (let i = 1; i < stops.length; i += 1) {
        const prev = stops[i - 1];
        const next = stops[i];
        if (offset <= next.offset) {
          const span = next.offset - prev.offset;
          const localT = span === 0 ? 1 : (offset - prev.offset) / span;
          return assertFiniteWidth(
            interpolate(prev.value, next.value, localT, mode),
            `stops profile at offset ${offset}`,
          );
        }
      }
      return assertFiniteWidth(stops[stops.length - 1].value, 'last stop');
    };
  }

  const profile = profiles[width.name];
  if (profile === undefined) {
    const available = Object.keys(profiles).sort().join(', ') || '(none)';
    throw new Error(
      `Ribbon width profile "${width.name}" is not registered. Available profiles: ${available}.`,
    );
  }
  const rawParams = width.params ?? {};
  const params = profile.paramsSchema
    ? profile.paramsSchema.parse(rawParams)
    : JsonObjectSchema.parse(rawParams);
  JsonObjectSchema.parse(params);
  return offset =>
    assertFiniteWidth(
      profile.widthAt({ offset, length: totalLength, params }),
      `profile "${width.name}" at offset ${offset}`,
    );
};

const centerlineWidthFunction = (
  ribbon: RibbonLike,
  profiles: Partial<Record<string, RibbonWidthProfileDefinition>>,
  totalLength: number,
): ((offset: number) => number) => {
  if (ribbon.width !== undefined) {
    return widthFunction(ribbon.width, profiles, totalLength);
  }
  const startWidth = ribbon.start?.width;
  const endWidth = ribbon.end?.width;
  if (startWidth === undefined || endWidth === undefined) {
    throw new Error(
      'Centerline ribbon requires either top-level `width` or both `start.width` and `end.width`.',
    );
  }
  const mode = ribbon.interpolation ?? 'linear';
  return offset =>
    assertFiniteWidth(
      interpolate(startWidth, endWidth, offset, mode),
      `endpoint width taper at offset ${offset}`,
    );
};

const centerlineWidthRequiresSampling = (ribbon: RibbonLike): boolean =>
  ribbon.width !== undefined && typeof ribbon.width !== 'number';

const commandsToSegmentInputs = (
  commands: ReadonlyArray<PathCommand>,
  source = 'centerline',
): Array<RibbonSegmentInput> => {
  const inputs: Array<RibbonSegmentInput> = [];
  let cursor: IRPosition | undefined;
  let moveCount = 0;
  for (const command of commands) {
    switch (command.kind) {
      case 'move':
        moveCount += 1;
        if (moveCount > 1) {
          throw new Error(
            `Ribbon ${source} must be a single open subpath; multiple move commands are not supported.`,
          );
        }
        cursor = command.to;
        break;
      case 'line': {
        const from = assertCursor(cursor, command);
        const to = command.to;
        if (distance(from, to) > 0) inputs.push({ kind: 'line', from, to });
        cursor = to;
        break;
      }
      case 'quad': {
        const from = assertCursor(cursor, command);
        const sampleAt = (t: number): SegmentSample =>
          quadSegmentSample(from, command.control, command.to, t);
        if (estimateLength(sampleAt) > 0) {
          inputs.push({ kind: 'quad', from, control: command.control, to: command.to });
        }
        cursor = command.to;
        break;
      }
      case 'cubic': {
        const from = assertCursor(cursor, command);
        const sampleAt = (t: number): SegmentSample =>
          cubicSegmentSample(from, command.control1, command.control2, command.to, t);
        if (estimateLength(sampleAt) > 0) {
          inputs.push({
            kind: 'cubic',
            from,
            control1: command.control1,
            control2: command.control2,
            to: command.to,
          });
        }
        cursor = command.to;
        break;
      }
      case 'arc': {
        assertCursor(cursor, command);
        const sampleAt = (t: number): SegmentSample =>
          arcSegmentSample(command.center, command.radius, command.startAngle, command.endAngle, t);
        if (estimateLength(sampleAt) > 0) {
          inputs.push({
            kind: 'arc',
            center: command.center,
            radius: command.radius,
            startAngle: command.startAngle,
            endAngle: command.endAngle,
            to: sampleAt(1).point,
          });
        }
        cursor = sampleAt(1).point;
        break;
      }
      case 'ellipseArc': {
        assertCursor(cursor, command);
        const sampleAt = (t: number): SegmentSample =>
          ellipseArcSegmentSample(
            command.center,
            command.radiusX,
            command.radiusY,
            command.startAngle,
            command.endAngle,
            t,
          );
        if (estimateLength(sampleAt) > 0) {
          inputs.push({
            kind: 'ellipseArc',
            center: command.center,
            radiusX: command.radiusX,
            radiusY: command.radiusY,
            startAngle: command.startAngle,
            endAngle: command.endAngle,
            to: sampleAt(1).point,
          });
        }
        cursor = sampleAt(1).point;
        break;
      }
      case 'close':
        throw new Error(`Ribbon ${source} must be open; close/cycle is not supported.`);
    }
  }
  return inputs;
};

const resolveSampleCount = (
  samples: IRPathRibbonOptions['samples'],
  sampling: IRRibbonSampling | undefined,
  totalLength: number,
): number | undefined => {
  if (samples !== undefined && sampling !== undefined) {
    throw new Error('Ribbon cannot use both `samples` and `sampling`.');
  }
  if (sampling?.kind === 'fixed') return sampling.samples;
  if (sampling?.kind === 'adaptive') {
    const maxSamples = sampling.maxSamples ?? 512;
    return Math.max(2, Math.min(maxSamples, Math.ceil(totalLength / sampling.tolerance) + 1));
  }
  if (samples === true) return DEFAULT_RIBBON_SAMPLES;
  if (samples === false || samples === undefined) return undefined;
  return samples;
};

const assertSampleCount = (samples: number): number => {
  if (!Number.isInteger(samples) || samples < 2 || samples > 512) {
    throw new Error(`Ribbon samples must be an integer in [2, 512]; got ${String(samples)}.`);
  }
  return samples;
};

const controlHandleLength = (
  anchor: IRPosition,
  control: IRPosition,
  fallback: number,
): number => {
  const handle = distance(anchor, control);
  return handle > 0 ? handle : fallback;
};

const segmentToSampler = (
  input: RibbonSegmentInput,
  index: number,
  count: number,
  endpointTangents: { start?: Vector2; end?: Vector2 } = {},
): ((t: number) => SegmentSample) => {
  const isFirst = index === 0;
  const isLast = index === count - 1;
  if (input.kind === 'line') {
    return (t: number): SegmentSample => lineSegmentSample(input.from, input.to, t);
  }
  if (input.kind === 'quad') {
    if ((isFirst && endpointTangents.start) || (isLast && endpointTangents.end)) {
      const fallback = distance(input.from, input.to) / 3;
      const control1Length = (controlHandleLength(input.from, input.control, fallback) * 2) / 3;
      const control2Length = (controlHandleLength(input.to, input.control, fallback) * 2) / 3;
      const control1 =
        isFirst && endpointTangents.start
          ? pointOnDirection(input.from, endpointTangents.start, control1Length)
          : ([
              input.from[0] + ((input.control[0] - input.from[0]) * 2) / 3,
              input.from[1] + ((input.control[1] - input.from[1]) * 2) / 3,
            ] satisfies IRPosition);
      const control2 =
        isLast && endpointTangents.end
          ? pointAgainstDirection(input.to, endpointTangents.end, control2Length)
          : ([
              input.to[0] + ((input.control[0] - input.to[0]) * 2) / 3,
              input.to[1] + ((input.control[1] - input.to[1]) * 2) / 3,
            ] satisfies IRPosition);
      return (t: number): SegmentSample =>
        cubicSegmentSample(input.from, control1, control2, input.to, t);
    }
    return (t: number): SegmentSample => quadSegmentSample(input.from, input.control, input.to, t);
  }
  if (input.kind === 'cubic') {
    const fallback = distance(input.from, input.to) / 3;
    const control1 =
      isFirst && endpointTangents.start
        ? pointOnDirection(
            input.from,
            endpointTangents.start,
            controlHandleLength(input.from, input.control1, fallback),
          )
        : input.control1;
    const control2 =
      isLast && endpointTangents.end
        ? pointAgainstDirection(
            input.to,
            endpointTangents.end,
            controlHandleLength(input.to, input.control2, fallback),
          )
        : input.control2;
    return (t: number): SegmentSample =>
      cubicSegmentSample(input.from, control1, control2, input.to, t);
  }
  if (input.kind === 'arc') {
    return (t: number): SegmentSample =>
      arcSegmentSample(input.center, input.radius, input.startAngle, input.endAngle, t);
  }
  return (t: number): SegmentSample =>
    ellipseArcSegmentSample(
      input.center,
      input.radiusX,
      input.radiusY,
      input.startAngle,
      input.endAngle,
      t,
    );
};

const segmentInputsToSegments = (
  inputs: ReadonlyArray<RibbonSegmentInput>,
  endpointTangents: { start?: Vector2; end?: Vector2 } = {},
): Array<RibbonSegment> => {
  const segments: Array<RibbonSegment> = [];
  for (let index = 0; index < inputs.length; index += 1) {
    const sampleAt = segmentToSampler(inputs[index], index, inputs.length, endpointTangents);
    const length = estimateLength(sampleAt);
    if (length > 0) segments.push({ sampleAt, length });
  }
  return segments;
};

const sampleAtDistance = (
  segments: ReadonlyArray<RibbonSegment>,
  totalLength: number,
  target: number,
): SegmentSample => {
  let acc = 0;
  for (const segment of segments) {
    const end = acc + segment.length;
    if (target <= end || segment === segments[segments.length - 1]) {
      const t = segment.length === 0 ? 0 : (target - acc) / segment.length;
      return segment.sampleAt(Math.max(0, Math.min(1, t)));
    }
    acc = end;
  }
  return segments[segments.length - 1].sampleAt(1);
};

const roundedArcPoints = (
  center: IRPosition,
  from: IRPosition,
  to: IRPosition,
  outwardDirection: Vector2,
  round: (n: number) => number,
): Array<IRPosition> => {
  const start = Math.atan2(from[1] - center[1], from[0] - center[0]);
  const end = Math.atan2(to[1] - center[1], to[0] - center[0]);
  let delta = end - start;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  const alternateDelta = delta > 0 ? delta - Math.PI * 2 : delta + Math.PI * 2;
  const midpointDot = (candidateDelta: number): number => {
    const angle = start + candidateDelta / 2;
    return Math.cos(angle) * outwardDirection[0] + Math.sin(angle) * outwardDirection[1];
  };
  if (midpointDot(alternateDelta) > midpointDot(delta)) {
    delta = alternateDelta;
  }
  const radius = distance(center, from);
  const points: Array<IRPosition> = [];
  for (let i = 1; i <= ARC_CAP_POINT_COUNT; i += 1) {
    const angle = start + (delta * i) / ARC_CAP_POINT_COUNT;
    points.push([
      round(center[0] + Math.cos(angle) * radius),
      round(center[1] + Math.sin(angle) * radius),
    ]);
  }
  return points;
};

const isArcCap = (cap: IRRibbonCap): cap is IRRibbonArcCap => typeof cap === 'object';

const assertArcCapRadius = (
  actual: number,
  expected: number,
  endpoint: 'start' | 'end',
  side: 'first' | 'second',
): void => {
  const tolerance = Math.max(0.01, Math.abs(expected) * 1e-4);
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Ribbon ${endpoint} arc cap radius must reach the ${side} side point; expected ${String(expected)}, got ${String(actual)}.`,
    );
  }
};

const arcCapPoints = (
  cap: IRRibbonArcCap,
  from: IRPosition,
  to: IRPosition,
  endpoint: 'start' | 'end',
  nameStack: NameStack,
  round: (n: number) => number,
): Array<IRPosition> => {
  const resolvedCenter = resolvePosition(cap.center, nameStack);
  if (resolvedCenter === null) {
    throw new Error(`Ribbon ${endpoint} arc cap center could not be resolved.`);
  }
  const center: IRPosition = [round(resolvedCenter[0]), round(resolvedCenter[1])];
  assertArcCapRadius(distance(center, from), cap.radius, endpoint, 'first');
  assertArcCapRadius(distance(center, to), cap.radius, endpoint, 'second');

  const start = Math.atan2(from[1] - center[1], from[0] - center[0]);
  const end = Math.atan2(to[1] - center[1], to[0] - center[0]);
  let delta = end - start;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  if (cap.sweep === 'long') {
    delta = delta > 0 ? delta - Math.PI * 2 : delta + Math.PI * 2;
  }

  const points: Array<IRPosition> = [];
  for (let i = 1; i <= ARC_CAP_POINT_COUNT; i += 1) {
    const angle = start + (delta * i) / ARC_CAP_POINT_COUNT;
    points.push([
      round(center[0] + Math.cos(angle) * cap.radius),
      round(center[1] + Math.sin(angle) * cap.radius),
    ]);
  }
  return points;
};

const midpoint = (a: IRPosition, b: IRPosition, round: (n: number) => number): IRPosition => [
  round((a[0] + b[0]) / 2),
  round((a[1] + b[1]) / 2),
];

const capExtension = (width: number, align: RibbonAlignmentValue): number => {
  if (align === 'center') return width / 2;
  return width;
};

const ribbonCrossSection = (
  sample: SegmentSample,
  offset: number,
  widthAt: (offset: number) => number,
  endpointTangents: { start: Vector2; end: Vector2 },
  align: RibbonAlignmentValue,
  round: (n: number) => number,
): RibbonCrossSection => {
  const width = widthAt(offset);
  const startTangent = alignTangentNormal(endpointTangents.start, sample.tangent);
  const endTangent = alignTangentNormal(endpointTangents.end, sample.tangent);
  const tangent =
    offset <= ENDPOINT_DIRECTION_BLEND_SPAN
      ? blendTangent(
          startTangent,
          sample.tangent,
          offset / ENDPOINT_DIRECTION_BLEND_SPAN,
          'start blended',
        )
      : offset >= 1 - ENDPOINT_DIRECTION_BLEND_SPAN
        ? blendTangent(
            endTangent,
            sample.tangent,
            (1 - offset) / ENDPOINT_DIRECTION_BLEND_SPAN,
            'end blended',
          )
        : sample.tangent;
  const normal = normalOf(tangent);
  const leftOffset = align === 'right' ? 0 : align === 'left' ? width : width / 2;
  const rightOffset = align === 'left' ? 0 : align === 'right' ? width : width / 2;
  const left: IRPosition = [
    round(sample.point[0] + normal[0] * leftOffset),
    round(sample.point[1] + normal[1] * leftOffset),
  ];
  const right: IRPosition = [
    round(sample.point[0] - normal[0] * rightOffset),
    round(sample.point[1] - normal[1] * rightOffset),
  ];
  if (!finitePoint(left) || !finitePoint(right)) {
    throw new Error('Ribbon sampling produced a non-finite coordinate; check width profile output.');
  }
  return {
    center: [round(sample.point[0]), round(sample.point[1])],
    left,
    right,
    tangent,
    width,
  };
};

const segmentInputToAnalyticSegment = (
  input: RibbonSegmentInput,
  index: number,
  count: number,
  endpointTangents: { start?: Vector2; end?: Vector2 } = {},
): RibbonAnalyticSegment | null => {
  const isFirst = index === 0;
  const isLast = index === count - 1;
  if (input.kind === 'line') return input;
  if (input.kind === 'quad') {
    if ((isFirst && endpointTangents.start) || (isLast && endpointTangents.end)) {
      const fallback = distance(input.from, input.to) / 3;
      const control1Length = (controlHandleLength(input.from, input.control, fallback) * 2) / 3;
      const control2Length = (controlHandleLength(input.to, input.control, fallback) * 2) / 3;
      return {
        kind: 'cubic',
        from: input.from,
        control1:
          isFirst && endpointTangents.start
            ? pointOnDirection(input.from, endpointTangents.start, control1Length)
            : [
                input.from[0] + ((input.control[0] - input.from[0]) * 2) / 3,
                input.from[1] + ((input.control[1] - input.from[1]) * 2) / 3,
              ],
        control2:
          isLast && endpointTangents.end
            ? pointAgainstDirection(input.to, endpointTangents.end, control2Length)
            : [
                input.to[0] + ((input.control[0] - input.to[0]) * 2) / 3,
                input.to[1] + ((input.control[1] - input.to[1]) * 2) / 3,
              ],
        to: input.to,
      };
    }
    return input;
  }
  if (input.kind === 'cubic') {
    const fallback = distance(input.from, input.to) / 3;
    return {
      kind: 'cubic',
      from: input.from,
      control1:
        isFirst && endpointTangents.start
          ? pointOnDirection(
              input.from,
              endpointTangents.start,
              controlHandleLength(input.from, input.control1, fallback),
            )
          : input.control1,
      control2:
        isLast && endpointTangents.end
          ? pointAgainstDirection(
              input.to,
              endpointTangents.end,
              controlHandleLength(input.to, input.control2, fallback),
            )
          : input.control2,
      to: input.to,
    };
  }
  return null;
};

const analyticSegmentSample = (
  segment: RibbonAnalyticSegment,
  t: number,
): SegmentSample => {
  if (segment.kind === 'line') return lineSegmentSample(segment.from, segment.to, t);
  if (segment.kind === 'quad') return quadSegmentSample(segment.from, segment.control, segment.to, t);
  return cubicSegmentSample(segment.from, segment.control1, segment.control2, segment.to, t);
};

const offsetAnalyticPoint = (
  point: IRPosition,
  sample: SegmentSample,
  offset: number,
  side: 'left' | 'right',
  widthAt: (offset: number) => number,
  endpointTangents: { start: Vector2; end: Vector2 },
  align: RibbonAlignmentValue,
  round: (n: number) => number,
): IRPosition => {
  const section = ribbonCrossSection(
    { point, tangent: sample.tangent },
    offset,
    widthAt,
    endpointTangents,
    align,
    round,
  );
  return side === 'left' ? section.left : section.right;
};

const outlineCommands = (
  segments: ReadonlyArray<RibbonSegment>,
  totalLength: number,
  sampleCount: number,
  widthAt: (offset: number) => number,
  endpointTangents: { start: Vector2; end: Vector2 },
  align: RibbonAlignmentValue,
  startEndpointCap: IRRibbonCap,
  endEndpointCap: IRRibbonCap,
  nameStack: NameStack,
  round: (n: number) => number,
): { commands: Array<PathCommand>; points: Array<IRPosition> } => {
  const left: Array<IRPosition> = [];
  const right: Array<IRPosition> = [];
  const centers: Array<IRPosition> = [];
  const tangents: Array<Vector2> = [];
  const widths: Array<number> = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const offset = sampleCount === 1 ? 0 : i / (sampleCount - 1);
    const sample = sampleAtDistance(segments, totalLength, offset * totalLength);
    const section = ribbonCrossSection(sample, offset, widthAt, endpointTangents, align, round);
    left.push(section.left);
    right.push(section.right);
    centers.push(section.center);
    tangents.push(section.tangent);
    widths.push(section.width);
  }

  if (startEndpointCap === 'square') {
    const ext = capExtension(widths[0], align);
    left[0] = [
      round(left[0][0] - tangents[0][0] * ext),
      round(left[0][1] - tangents[0][1] * ext),
    ];
    right[0] = [
      round(right[0][0] - tangents[0][0] * ext),
      round(right[0][1] - tangents[0][1] * ext),
    ];
  }
  if (endEndpointCap === 'square') {
    const last = sampleCount - 1;
    const ext = capExtension(widths[last], align);
    left[last] = [
      round(left[last][0] + tangents[last][0] * ext),
      round(left[last][1] + tangents[last][1] * ext),
    ];
    right[last] = [
      round(right[last][0] + tangents[last][0] * ext),
      round(right[last][1] + tangents[last][1] * ext),
    ];
  }

  const commands: Array<PathCommand> = [{ kind: 'move', to: left[0] }];
  for (let i = 1; i < left.length; i += 1) commands.push({ kind: 'line', to: left[i] });
  if (isArcCap(endEndpointCap)) {
    const last = sampleCount - 1;
    for (const point of arcCapPoints(
      endEndpointCap,
      left[last],
      right[last],
      'end',
      nameStack,
      round,
    )) {
      commands.push({ kind: 'line', to: point });
    }
  } else if (endEndpointCap === 'round') {
    const last = sampleCount - 1;
    for (const point of roundedArcPoints(
      midpoint(left[last], right[last], round),
      left[last],
      right[last],
      tangents[last],
      round,
    )) {
      commands.push({ kind: 'line', to: point });
    }
  } else {
    commands.push({ kind: 'line', to: right[right.length - 1] });
  }
  for (let i = right.length - 2; i >= 0; i -= 1) commands.push({ kind: 'line', to: right[i] });
  if (isArcCap(startEndpointCap)) {
    for (const point of arcCapPoints(
      startEndpointCap,
      right[0],
      left[0],
      'start',
      nameStack,
      round,
    )) {
      commands.push({ kind: 'line', to: point });
    }
  } else if (startEndpointCap === 'round') {
    for (const point of roundedArcPoints(
      midpoint(left[0], right[0], round),
      right[0],
      left[0],
      [-tangents[0][0], -tangents[0][1]],
      round,
    )) {
      commands.push({ kind: 'line', to: point });
    }
  }
  commands.push({ kind: 'close' });
  return { commands, points: [...left, ...right] };
};

const analyticOutlineCommands = (
  inputs: ReadonlyArray<RibbonSegmentInput>,
  segments: ReadonlyArray<RibbonSegment>,
  totalLength: number,
  widthAt: (offset: number) => number,
  endpointTangents: { start: Vector2; end: Vector2 },
  endpointTangentOverrides: { start?: Vector2; end?: Vector2 },
  align: RibbonAlignmentValue,
  startEndpointCap: IRRibbonCap,
  endEndpointCap: IRRibbonCap,
  nameStack: NameStack,
  round: (n: number) => number,
): { commands: Array<PathCommand>; points: Array<IRPosition> } | null => {
  if (inputs.length !== segments.length) return null;

  const analyticSegments: Array<RibbonAnalyticSegment> = [];
  for (let index = 0; index < inputs.length; index += 1) {
    const analytic = segmentInputToAnalyticSegment(
      inputs[index],
      index,
      inputs.length,
      endpointTangentOverrides,
    );
    if (analytic === null) return null;
    analyticSegments.push(analytic);
  }

  const leftCommands: Array<PathCommand> = [];
  const rightCommands: Array<PathCommand> = [];
  const points: Array<IRPosition> = [];
  const offsetAt = (segmentIndex: number, t: number): number => {
    const lengthBefore = segments
      .slice(0, segmentIndex)
      .reduce((sum, segment) => sum + segment.length, 0);
    return (lengthBefore + segments[segmentIndex].length * t) / totalLength;
  };

  const sectionAt = (segmentIndex: number, t: number): RibbonCrossSection => {
    const sample = analyticSegmentSample(analyticSegments[segmentIndex], t);
    return ribbonCrossSection(
      sample,
      offsetAt(segmentIndex, t),
      widthAt,
      endpointTangents,
      align,
      round,
    );
  };

  const offsetControl = (
    segmentIndex: number,
    point: IRPosition,
    t: number,
    side: 'left' | 'right',
  ): IRPosition =>
    offsetAnalyticPoint(
      point,
      analyticSegmentSample(analyticSegments[segmentIndex], t),
      offsetAt(segmentIndex, t),
      side,
      widthAt,
      endpointTangents,
      align,
      round,
    );

  const start = sectionAt(0, 0);
  let startLeft = start.left;
  let startRight = start.right;
  let startTangent = start.tangent;
  let startWidth = start.width;
  let endSection = start;

  for (let index = 0; index < analyticSegments.length; index += 1) {
    const segment = analyticSegments[index];
    const startSection = index === 0 ? start : sectionAt(index, 0);
    endSection = sectionAt(index, 1);
    if (index === 0) {
      startLeft = startSection.left;
      startRight = startSection.right;
      startTangent = startSection.tangent;
      startWidth = startSection.width;
    }

    if (segment.kind === 'line') {
      leftCommands.push({ kind: 'line', to: endSection.left });
      rightCommands.push({ kind: 'line', to: startSection.right });
      points.push(startSection.left, endSection.left, startSection.right, endSection.right);
    } else if (segment.kind === 'quad') {
      const leftControl = offsetControl(index, segment.control, 0.5, 'left');
      const rightControl = offsetControl(index, segment.control, 0.5, 'right');
      leftCommands.push({ kind: 'quad', control: leftControl, to: endSection.left });
      rightCommands.push({ kind: 'quad', control: rightControl, to: startSection.right });
      points.push(
        startSection.left,
        leftControl,
        endSection.left,
        startSection.right,
        rightControl,
        endSection.right,
      );
    } else {
      const leftControl1 = offsetControl(index, segment.control1, 1 / 3, 'left');
      const leftControl2 = offsetControl(index, segment.control2, 2 / 3, 'left');
      const rightControl1 = offsetControl(index, segment.control1, 1 / 3, 'right');
      const rightControl2 = offsetControl(index, segment.control2, 2 / 3, 'right');
      leftCommands.push({
        kind: 'cubic',
        control1: leftControl1,
        control2: leftControl2,
        to: endSection.left,
      });
      rightCommands.push({
        kind: 'cubic',
        control1: rightControl2,
        control2: rightControl1,
        to: startSection.right,
      });
      points.push(
        startSection.left,
        leftControl1,
        leftControl2,
        endSection.left,
        startSection.right,
        rightControl1,
        rightControl2,
        endSection.right,
      );
    }
  }

  let endLeft = endSection.left;
  let endRight = endSection.right;
  const endTangent = endSection.tangent;
  const endWidth = endSection.width;

  if (startEndpointCap === 'square') {
    const ext = capExtension(startWidth, align);
    startLeft = [
      round(startLeft[0] - startTangent[0] * ext),
      round(startLeft[1] - startTangent[1] * ext),
    ];
    startRight = [
      round(startRight[0] - startTangent[0] * ext),
      round(startRight[1] - startTangent[1] * ext),
    ];
  }
  if (endEndpointCap === 'square') {
    const ext = capExtension(endWidth, align);
    endLeft = [
      round(endLeft[0] + endTangent[0] * ext),
      round(endLeft[1] + endTangent[1] * ext),
    ];
    endRight = [
      round(endRight[0] + endTangent[0] * ext),
      round(endRight[1] + endTangent[1] * ext),
    ];
  }

  const commands: Array<PathCommand> = [{ kind: 'move', to: startLeft }];
  commands.push(...leftCommands);
  const lastLeftCommand = commands[commands.length - 1];
  if ('to' in lastLeftCommand) lastLeftCommand.to = endLeft;
  if (isArcCap(endEndpointCap)) {
    for (const point of arcCapPoints(
      endEndpointCap,
      endLeft,
      endRight,
      'end',
      nameStack,
      round,
    )) {
      commands.push({ kind: 'line', to: point });
    }
  } else if (endEndpointCap === 'round') {
    for (const point of roundedArcPoints(
      midpoint(endLeft, endRight, round),
      endLeft,
      endRight,
      endTangent,
      round,
    )) {
      commands.push({ kind: 'line', to: point });
    }
  } else {
    commands.push({ kind: 'line', to: endRight });
  }
  for (let index = rightCommands.length - 1; index >= 0; index -= 1) {
    const command = { ...rightCommands[index] };
    if (index === 0 && 'to' in command) command.to = startRight;
    commands.push(command);
  }
  if (isArcCap(startEndpointCap)) {
    for (const point of arcCapPoints(
      startEndpointCap,
      startRight,
      startLeft,
      'start',
      nameStack,
      round,
    )) {
      commands.push({ kind: 'line', to: point });
    }
  } else if (startEndpointCap === 'round') {
    for (const point of roundedArcPoints(
      midpoint(startLeft, startRight, round),
      startRight,
      startLeft,
      [-startTangent[0], -startTangent[1]],
      round,
    )) {
      commands.push({ kind: 'line', to: point });
    }
  }
  commands.push({ kind: 'close' });
  return { commands, points: [...points, startLeft, startRight, endLeft, endRight] };
};

const emittedPathFromSteps = (
  steps: ReadonlyArray<IRStep>,
  source: string,
  nameStack: NameStack,
  round: (n: number) => number,
  measureText: TextMeasurer,
  options: RibbonEmitOptions,
): PathPrim => {
  const path: IRPath = {
    type: 'path',
    children: steps.map(stripStepLabel),
  };
  const emitted = emitPathPrimitive(path, nameStack, round, measureText, options);
  if (emitted === null) {
    throw new Error(`Ribbon ${source} path was skipped unexpectedly.`);
  }
  if (emitted.primitives.length !== 1 || !isPathPrim(emitted.primitives[0])) {
    throw new Error(`Ribbon ${source} must lower to exactly one open Path primitive.`);
  }
  return emitted.primitives[0];
};

const segmentsFromSteps = (
  steps: ReadonlyArray<IRStep>,
  source: string,
  nameStack: NameStack,
  round: (n: number) => number,
  measureText: TextMeasurer,
  options: RibbonEmitOptions,
  endpointTangents: { start?: Vector2; end?: Vector2 } = {},
): { segments: Array<RibbonSegment>; totalLength: number } => {
  const prim = emittedPathFromSteps(steps, source, nameStack, round, measureText, options);
  const inputs = commandsToSegmentInputs(prim.commands, source);
  const segments = segmentInputsToSegments(inputs, endpointTangents);
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    throw new Error(`Ribbon ${source} has zero length; at least one nonzero segment is required.`);
  }
  return { segments, totalLength };
};

const boundaryOutlineCommands = (
  upper: ReadonlyArray<RibbonSegment>,
  upperLength: number,
  lower: ReadonlyArray<RibbonSegment>,
  lowerLength: number,
  sampleCount: number,
  round: (n: number) => number,
): { commands: Array<PathCommand>; points: Array<IRPosition> } => {
  const upperPoints: Array<IRPosition> = [];
  const lowerPoints: Array<IRPosition> = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const offset = i / (sampleCount - 1);
    const upperPoint = sampleAtDistance(upper, upperLength, offset * upperLength).point;
    const lowerPoint = sampleAtDistance(lower, lowerLength, offset * lowerLength).point;
    const u: IRPosition = [round(upperPoint[0]), round(upperPoint[1])];
    const l: IRPosition = [round(lowerPoint[0]), round(lowerPoint[1])];
    if (!finitePoint(u) || !finitePoint(l)) {
      throw new Error('Ribbon boundary sampling produced a non-finite coordinate.');
    }
    upperPoints.push(u);
    lowerPoints.push(l);
  }
  const commands: Array<PathCommand> = [{ kind: 'move', to: upperPoints[0] }];
  for (let i = 1; i < upperPoints.length; i += 1) {
    commands.push({ kind: 'line', to: upperPoints[i] });
  }
  for (let i = lowerPoints.length - 1; i >= 0; i -= 1) {
    commands.push({ kind: 'line', to: lowerPoints[i] });
  }
  commands.push({ kind: 'close' });
  return { commands, points: [...upperPoints, ...lowerPoints] };
};

const styledPrimitiveFromOutline = (
  ribbon: RibbonLike,
  outline: { commands: Array<PathCommand>; points: Array<IRPosition> },
  resolvePaint: PaintResolver,
): PathPrim => {
  const outlineRequested = ribbon.stroke !== undefined || ribbon.strokeWidth !== undefined;
  const primitive: PathPrim = {
    type: 'path',
    commands: outline.commands,
    fill: resolvePaint(ribbon.fill) ?? 'currentColor',
    fillOpacity: ribbon.fillOpacity,
    opacity: ribbon.opacity,
    shadow: resolveShadow(ribbon.shadow),
    blendMode: ribbon.blendMode,
  };
  if (outlineRequested) {
    primitive.stroke = resolvePaint(ribbon.stroke) ?? 'currentColor';
    primitive.strokeWidth = ribbon.strokeWidth ?? 1;
    primitive.strokeOpacity = ribbon.drawOpacity;
  }
  if (ribbon.id !== undefined) primitive.id = ribbon.id;
  if (ribbon.meta !== undefined) primitive.meta = ribbon.meta;
  if (ribbon.animations !== undefined) primitive.animations = ribbon.animations;
  return primitive;
};

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
  const connectionTangent = normalizeVector(
    [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]],
    'connection',
  );
  const endpointTangents = {
    start: directionToTangent(ribbon.start?.direction, connectionTangent, 'start'),
    end: directionToTangent(ribbon.end?.direction, connectionTangent, 'end'),
  };
  const segments = segmentInputsToSegments(segmentInputs, {
    start: ribbon.start?.direction === undefined ? undefined : endpointTangents.start,
    end: ribbon.end?.direction === undefined ? undefined : endpointTangents.end,
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    throw new Error('Ribbon centerline has zero length; at least one nonzero segment is required.');
  }
  const widthAt = centerlineWidthFunction(
    ribbon,
    options.ribbonWidthProfiles ?? {},
    totalLength,
  );
  const samples = resolveSampleCount(ribbon.samples, ribbon.sampling, totalLength);
  const sampleCount =
    samples ?? (centerlineWidthRequiresSampling(ribbon) ? DEFAULT_RIBBON_SAMPLES : undefined);
  const outline =
    sampleCount === undefined
      ? analyticOutlineCommands(
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
        )
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
        warn: (code, message) =>
          options.onWarn?.({ code, message, path: `${options.irPath ?? 'ribbon'}.label` }),
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

export type { RibbonEmitOptions };
