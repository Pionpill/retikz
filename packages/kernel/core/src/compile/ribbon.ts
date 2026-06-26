import { type Vector2, polar, vector2 } from '../geometry';
import type { PathCommand, PathPrim, ScenePrimitive } from '../primitive';
import type { IRPath, IRPosition, IRRibbon, IRRibbonDirection, IRRibbonWidth, IRStep } from '../schemas';
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
): Array<RibbonSegmentInput> => {
  const inputs: Array<RibbonSegmentInput> = [];
  let cursor: IRPosition | undefined;
  let moveCount = 0;
  for (const command of commands) {
    switch (command.kind) {
      case 'move':
        moveCount += 1;
        if (moveCount > 1) {
          throw new Error('Ribbon centerline must be a single open subpath; multiple move commands are not supported.');
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
        throw new Error('Ribbon centerline must be open; close/cycle is not supported.');
    }
  }
  return inputs;
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

const outlineCommands = (
  segments: ReadonlyArray<RibbonSegment>,
  totalLength: number,
  sampleCount: number,
  widthAt: (offset: number) => number,
  endpointTangents: { start: Vector2; end: Vector2 },
  round: (n: number) => number,
): { commands: Array<PathCommand>; points: Array<IRPosition> } => {
  const left: Array<IRPosition> = [];
  const right: Array<IRPosition> = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const offset = sampleCount === 1 ? 0 : i / (sampleCount - 1);
    const sample = sampleAtDistance(segments, totalLength, offset * totalLength);
    const width = widthAt(offset);
    const half = width / 2;
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
    const l: IRPosition = [
      round(sample.point[0] + normal[0] * half),
      round(sample.point[1] + normal[1] * half),
    ];
    const r: IRPosition = [
      round(sample.point[0] - normal[0] * half),
      round(sample.point[1] - normal[1] * half),
    ];
    if (!finitePoint(l) || !finitePoint(r)) {
      throw new Error('Ribbon sampling produced a non-finite coordinate; check width profile output.');
    }
    left.push(l);
    right.push(r);
  }

  const commands: Array<PathCommand> = [{ kind: 'move', to: left[0] }];
  for (let i = 1; i < left.length; i += 1) commands.push({ kind: 'line', to: left[i] });
  for (let i = right.length - 1; i >= 0; i -= 1) commands.push({ kind: 'line', to: right[i] });
  commands.push({ kind: 'close' });
  return { commands, points: [...left, ...right] };
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
  const centerPath: IRPath = {
    type: 'path',
    children: ribbon.children.map(stripStepLabel),
  };
  const emitted = emitPathPrimitive(centerPath, nameStack, round, measureText, options);
  if (emitted === null) return null;
  if (emitted.primitives.length !== 1 || !isPathPrim(emitted.primitives[0])) {
    throw new Error('Ribbon centerline must lower to exactly one open Path primitive.');
  }
  const segmentInputs = commandsToSegmentInputs(emitted.primitives[0].commands);
  const rawSegments = segmentInputsToSegments(segmentInputs);
  const rawTotalLength = rawSegments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(rawTotalLength) || rawTotalLength <= 0) {
    throw new Error('Ribbon centerline has zero length; at least one nonzero segment is required.');
  }
  const samples = ribbon.samples ?? DEFAULT_RIBBON_SAMPLES;
  if (!Number.isInteger(samples) || samples < 2 || samples > 512) {
    throw new Error(
      `Ribbon samples must be an integer in [2, 512]; got ${String(samples)}.`,
    );
  }
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
    round,
  );

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
  return { primitives: [primitive], points: outline.points };
};

export type { RibbonEmitOptions };
