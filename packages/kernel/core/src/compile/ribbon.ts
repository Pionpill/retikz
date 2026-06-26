import { type Vector2, polar, vector2 } from '../geometry';
import type { PathCommand, PathPrim, ScenePrimitive } from '../primitive';
import type {
  IRPath,
  IRPosition,
  IRRibbon,
  IRRibbonDirection,
  IRRibbonSampling,
  IRRibbonWidth,
  IRStep,
  RibbonAlignmentValue,
  RibbonCapValue,
} from '../schemas';
import { JsonObjectSchema } from '../schemas';
import type { RibbonWidthProfileDefinition } from '../contract/ribbon';
import type { NameStack } from './name-stack';
import type { TextMeasurer } from './text-metrics';
import type { PaintResolver } from './paint';
import { type EmitPathWarnHook, emitPathPrimitive } from './path';
import {
  type SegmentSample,
  arcSegmentSample,
  cubicSegmentSample,
  ellipseArcSegmentSample,
  lineSegmentSample,
  quadSegmentSample,
} from '../geometry/segment';
import { resolveShadow } from './effects';

const DEFAULT_RIBBON_SAMPLES = 48;
const LENGTH_SUBDIVISIONS = 16;
const ENDPOINT_DIRECTION_BLEND_SPAN = 0.18;

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

type ProfileRibbonWidth = Extract<IRRibbonWidth, { kind: 'profile' }>;

const isProfileRibbonWidth = (
  width: Exclude<IRRibbonWidth, number>,
): width is ProfileRibbonWidth => 'name' in width;

const widthFunction = (
  width: IRRibbonWidth,
  profiles: Partial<Record<string, RibbonWidthProfileDefinition>>,
  totalLength: number,
): ((offset: number) => number) => {
  if (typeof width === 'number') {
    return () => assertFiniteWidth(width, 'number');
  }

  if (width.kind === undefined || width.kind === 'linear') {
    const mode = width.interpolation ?? 'linear';
    return offset =>
      assertFiniteWidth(
        interpolate(width.start, width.end, offset, mode),
        `linear profile at offset ${offset}`,
      );
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

  if (!isProfileRibbonWidth(width)) {
    throw new Error(`Unsupported ribbon width kind: ${String(width.kind)}.`);
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
  samples: number | undefined,
  sampling: IRRibbonSampling | undefined,
  totalLength: number,
): number => {
  if (samples !== undefined && sampling !== undefined) {
    throw new Error('Ribbon cannot use both `samples` and `sampling`.');
  }
  if (sampling?.kind === 'fixed') return sampling.samples;
  if (sampling?.kind === 'adaptive') {
    const maxSamples = sampling.maxSamples ?? 512;
    return Math.max(2, Math.min(maxSamples, Math.ceil(totalLength / sampling.tolerance) + 1));
  }
  return samples ?? DEFAULT_RIBBON_SAMPLES;
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
  round: (n: number) => number,
): Array<IRPosition> => {
  const start = Math.atan2(from[1] - center[1], from[0] - center[0]);
  const end = Math.atan2(to[1] - center[1], to[0] - center[0]);
  let delta = end - start;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  const radius = distance(center, from);
  const points: Array<IRPosition> = [];
  for (let i = 1; i <= 8; i += 1) {
    const angle = start + (delta * i) / 8;
    points.push([
      round(center[0] + Math.cos(angle) * radius),
      round(center[1] + Math.sin(angle) * radius),
    ]);
  }
  return points;
};

const capExtension = (width: number, align: RibbonAlignmentValue): number => {
  if (align === 'center') return width / 2;
  return width;
};

const outlineCommands = (
  segments: ReadonlyArray<RibbonSegment>,
  totalLength: number,
  sampleCount: number,
  widthAt: (offset: number) => number,
  endpointTangents: { start: Vector2; end: Vector2 },
  align: RibbonAlignmentValue,
  startCap: RibbonCapValue,
  endCap: RibbonCapValue,
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
    const l: IRPosition = [
      round(sample.point[0] + normal[0] * leftOffset),
      round(sample.point[1] + normal[1] * leftOffset),
    ];
    const r: IRPosition = [
      round(sample.point[0] - normal[0] * rightOffset),
      round(sample.point[1] - normal[1] * rightOffset),
    ];
    if (!finitePoint(l) || !finitePoint(r)) {
      throw new Error('Ribbon sampling produced a non-finite coordinate; check width profile output.');
    }
    left.push(l);
    right.push(r);
    centers.push([round(sample.point[0]), round(sample.point[1])]);
    tangents.push(tangent);
    widths.push(width);
  }

  if (startCap === 'square') {
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
  if (endCap === 'square') {
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
  if (endCap === 'round') {
    const last = sampleCount - 1;
    for (const point of roundedArcPoints(centers[last], left[last], right[last], round)) {
      commands.push({ kind: 'line', to: point });
    }
  } else {
    commands.push({ kind: 'line', to: right[right.length - 1] });
  }
  for (let i = right.length - 2; i >= 0; i -= 1) commands.push({ kind: 'line', to: right[i] });
  if (startCap === 'round') {
    for (const point of roundedArcPoints(centers[0], right[0], left[0], round)) {
      commands.push({ kind: 'line', to: point });
    }
  }
  commands.push({ kind: 'close' });
  return { commands, points: [...left, ...right] };
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
  ribbon: IRRibbon,
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
  ribbon: IRRibbon,
  nameStack: NameStack,
  round: (n: number) => number,
  measureText: TextMeasurer,
  options: RibbonEmitOptions = {},
): { primitives: Array<ScenePrimitive>; points: Array<IRPosition> } | null => {
  const resolvePaint: PaintResolver =
    options.resolvePaint ?? (p => (typeof p === 'string' || p === undefined ? p : undefined));
  if (ribbon.kind === 'boundary') {
    if (ribbon.upper === undefined || ribbon.lower === undefined) {
      throw new Error('Boundary ribbon requires `upper` and `lower` steps.');
    }
    const upper = segmentsFromSteps(ribbon.upper, 'upper boundary', nameStack, round, measureText, options);
    const lower = segmentsFromSteps(ribbon.lower, 'lower boundary', nameStack, round, measureText, options);
    const samples = assertSampleCount(
      resolveSampleCount(ribbon.samples, ribbon.sampling, Math.max(upper.totalLength, lower.totalLength)),
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

  if (ribbon.children === undefined || ribbon.width === undefined) {
    throw new Error('Centerline ribbon requires `children` and `width`.');
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
  const samples = assertSampleCount(resolveSampleCount(ribbon.samples, ribbon.sampling, rawTotalLength));
  const startPoint = sampleAtDistance(rawSegments, rawTotalLength, 0).point;
  const endPoint = sampleAtDistance(rawSegments, rawTotalLength, rawTotalLength).point;
  const connectionTangent = normalizeVector(
    [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]],
    'connection',
  );
  const endpointTangents = {
    start: directionToTangent(ribbon.startDirection, connectionTangent, 'start'),
    end: directionToTangent(ribbon.endDirection, connectionTangent, 'end'),
  };
  const segments = segmentInputsToSegments(segmentInputs, {
    start: ribbon.startDirection === undefined ? undefined : endpointTangents.start,
    end: ribbon.endDirection === undefined ? undefined : endpointTangents.end,
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    throw new Error('Ribbon centerline has zero length; at least one nonzero segment is required.');
  }
  const widthAt = widthFunction(ribbon.width, options.ribbonWidthProfiles ?? {}, totalLength);
  const outline = outlineCommands(
    segments,
    totalLength,
    samples,
    widthAt,
    endpointTangents,
    ribbon.align ?? 'center',
    ribbon.startCap ?? 'butt',
    ribbon.endCap ?? 'butt',
    round,
  );

  return {
    primitives: [styledPrimitiveFromOutline(ribbon, outline, resolvePaint)],
    points: outline.points,
  };
};

export type { RibbonEmitOptions };
