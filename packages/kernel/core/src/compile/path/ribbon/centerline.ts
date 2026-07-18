import type { Vector2 } from '@retikz/math';

import { point, vector2 } from '@retikz/math';

import type { PathCommand, PathPrim, ScenePrimitive } from '../../../contract';
import type { IRPath, IRPosition, IRRibbonDirection, IRStep } from '../../../schemas';
import type { SegmentSample } from '../../../shared/geometry';
import type { NamespaceStack } from '../../namespace';
import type { TextMeasurer } from '../../text';
import type { RibbonEmitOptions, RibbonSegment, RibbonSegmentInput } from './types';

import { isPositionTuple } from '../../../shared';
import {
  arcSegmentSample,
  cubicSegmentSample,
  ellipseArcSegmentSample,
  lineSegmentSample,
  polar,
  quadSegmentSample,
} from '../../../shared/geometry';
import { emitPathPrimitive } from '../stroke';

const LENGTH_SUBDIVISIONS = 16;

/** 去掉 step.label，让中心线复用 path emit 时不会额外产出 label primitive */
export const stripStepLabel = (step: IRStep): IRStep => {
  const next = { ...step } as IRStep;
  if ('label' in next) delete next.label;
  return next;
};

const isPathPrim = (prim: ScenePrimitive): prim is PathPrim => prim.type === 'path';

const assertCursor = (cursor: IRPosition | undefined, command: PathCommand): IRPosition => {
  if (cursor !== undefined) return cursor;
  throw new Error(`Ribbon centerline command "${command.kind}" has no current point; start with a move step.`);
};

/** 校验并归一化 ribbon 方向向量；零向量或非有限值直接报错 */
export const normalizeVector = (vector: Vector2, source: string): Vector2 => {
  const normalized = vector2.normalizeOrNull(vector);
  if (normalized === null) {
    throw new Error(`Ribbon ${source} direction must be a finite nonzero vector.`);
  }
  return normalized;
};

/** 把端点切线翻到与参考切线同侧，避免首尾横截面左右侧反转 */
export const alignTangentNormal = (tangent: Vector2, reference: Vector2): Vector2 => {
  const normal = vector2.normal(tangent);
  const referenceNormal = vector2.normal(reference);
  return normal[0] * referenceNormal[0] + normal[1] * referenceNormal[1] < 0 ? [-tangent[0], -tangent[1]] : tangent;
};

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * 在端点指定方向和中心线采样切线之间平滑过渡
 * @description 只用于首尾一小段，避免用户指定 start/end direction 时横截面突然旋转
 */
export type BlendTangentInput = {
  endpointTangent: Vector2;
  sampleTangent: Vector2;
  t: number;
  source: string;
};

export const blendTangent = ({ endpointTangent, sampleTangent, t, source }: BlendTangentInput): Vector2 => {
  const u = smoothstep(Math.max(0, Math.min(1, t)));
  return normalizeVector(
    [
      endpointTangent[0] + (sampleTangent[0] - endpointTangent[0]) * u,
      endpointTangent[1] + (sampleTangent[1] - endpointTangent[1]) * u,
    ],
    source,
  );
};

/**
 * 把 ribbon 端点 direction 解析为单位切线
 * @description 支持角度、显式向量和无字符串 origin 的 PolarPosition；未配置时沿用整条连接线方向
 */
export const directionToTangent = (
  direction: IRRibbonDirection | undefined,
  fallback: Vector2,
  source: string,
): Vector2 => {
  if (direction === undefined) return fallback;
  if (typeof direction === 'number') {
    return vector2.fromAngleDegrees(direction);
  }
  if (isPositionTuple(direction)) {
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

/** 用固定细分估算曲线弧长，供 offset→segment 映射和采样数量选择使用 */
export const estimateLength = (sampleAt: (t: number) => SegmentSample): number => {
  let total = 0;
  let prev = sampleAt(0).point;
  for (let i = 1; i <= LENGTH_SUBDIVISIONS; i += 1) {
    const curr = sampleAt(i / LENGTH_SUBDIVISIONS).point;
    total += point.distance(prev, curr);
    prev = curr;
  }
  return total;
};

/** 控制柄长度兜底：退化控制点用兜底长度，避免端点方向覆盖时生成零柄 */
export const controlHandleLength = (anchor: IRPosition, control: IRPosition, fallback: number): number => {
  const handle = point.distance(anchor, control);
  return handle > 0 ? handle : fallback;
};

/**
 * PathCommand → RibbonSegmentInput
 * @description ribbon 只支持单条开放子路径；零长度段会被丢弃，close / 多 move 会立即报错
 */
export const commandsToSegmentInputs = (
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
          throw new Error(`Ribbon ${source} must be a single open subpath; multiple move commands are not supported.`);
        }
        cursor = command.to;
        break;
      case 'line': {
        const from = assertCursor(cursor, command);
        const to = command.to;
        if (point.distance(from, to) > 0) inputs.push({ kind: 'line', from, to });
        cursor = to;
        break;
      }
      case 'quad': {
        const from = assertCursor(cursor, command);
        const sampleAt = (t: number): SegmentSample => quadSegmentSample(from, command.control, command.to, t);
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

type SegmentToSamplerInput = {
  input: RibbonSegmentInput;
  index: number;
  count: number;
  endpointTangents?: { start?: Vector2; end?: Vector2 };
};

const segmentToSampler = ({
  input,
  index,
  count,
  endpointTangents = {},
}: SegmentToSamplerInput): ((t: number) => SegmentSample) => {
  const isFirst = index === 0;
  const isLast = index === count - 1;
  if (input.kind === 'line') {
    return (t: number): SegmentSample => lineSegmentSample(input.from, input.to, t);
  }
  if (input.kind === 'quad') {
    if ((isFirst && endpointTangents.start) || (isLast && endpointTangents.end)) {
      const fallback = point.distance(input.from, input.to) / 3;
      const control1Length = (controlHandleLength(input.from, input.control, fallback) * 2) / 3;
      const control2Length = (controlHandleLength(input.to, input.control, fallback) * 2) / 3;
      const control1 =
        isFirst && endpointTangents.start
          ? point.along(input.from, endpointTangents.start, control1Length)
          : ([
              input.from[0] + ((input.control[0] - input.from[0]) * 2) / 3,
              input.from[1] + ((input.control[1] - input.from[1]) * 2) / 3,
            ] satisfies IRPosition);
      const control2 =
        isLast && endpointTangents.end
          ? point.against(input.to, endpointTangents.end, control2Length)
          : ([
              input.to[0] + ((input.control[0] - input.to[0]) * 2) / 3,
              input.to[1] + ((input.control[1] - input.to[1]) * 2) / 3,
            ] satisfies IRPosition);
      return (t: number): SegmentSample => cubicSegmentSample(input.from, control1, control2, input.to, t);
    }
    return (t: number): SegmentSample => quadSegmentSample(input.from, input.control, input.to, t);
  }
  if (input.kind === 'cubic') {
    const fallback = point.distance(input.from, input.to) / 3;
    const control1 =
      isFirst && endpointTangents.start
        ? point.along(input.from, endpointTangents.start, controlHandleLength(input.from, input.control1, fallback))
        : input.control1;
    const control2 =
      isLast && endpointTangents.end
        ? point.against(input.to, endpointTangents.end, controlHandleLength(input.to, input.control2, fallback))
        : input.control2;
    return (t: number): SegmentSample => cubicSegmentSample(input.from, control1, control2, input.to, t);
  }
  if (input.kind === 'arc') {
    return (t: number): SegmentSample =>
      arcSegmentSample(input.center, input.radius, input.startAngle, input.endAngle, t);
  }
  return (t: number): SegmentSample =>
    ellipseArcSegmentSample(input.center, input.radiusX, input.radiusY, input.startAngle, input.endAngle, t);
};

/**
 * RibbonSegmentInput → 可采样中心线段
 * @description start/end direction 覆盖会重算首尾 Bezier 控制柄，使轮廓端面切线与用户指定方向一致
 */
export const segmentInputsToSegments = (
  inputs: ReadonlyArray<RibbonSegmentInput>,
  endpointTangents: { start?: Vector2; end?: Vector2 } = {},
): Array<RibbonSegment> => {
  const segments: Array<RibbonSegment> = [];
  for (let index = 0; index < inputs.length; index += 1) {
    const sampleAt = segmentToSampler({ input: inputs[index], index, count: inputs.length, endpointTangents });
    const length = estimateLength(sampleAt);
    if (length > 0) segments.push({ sampleAt, length });
  }
  return segments;
};

/** 按累计弧长在整条中心线上取样；target 会落到对应 segment 的局部 t */
export const sampleAtDistance = (
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

export type EmittedPathFromStepsInput = {
  steps: ReadonlyArray<IRStep>;
  source: string;
  namespaceStack: NamespaceStack;
  round: (n: number) => number;
  measureText: TextMeasurer;
  options: RibbonEmitOptions;
};

/**
 * 复用普通 path emit，把 ribbon.children 降成单个 PathPrim
 * @description 这一步负责解析节点引用、relative、generator 等 path 语义；ribbon 后续只消费已物化的 commands
 */
export const emittedPathFromSteps = ({
  steps,
  source,
  namespaceStack,
  round,
  measureText,
  options,
}: EmittedPathFromStepsInput): PathPrim => {
  const path: IRPath = {
    type: 'path',
    children: steps.map(stripStepLabel),
  };
  const emitted = emitPathPrimitive(path, { namespaceStack, round, measureText, options });
  if (emitted === null) {
    throw new Error(`Ribbon ${source} path was skipped unexpectedly.`);
  }
  if (emitted.primitives.length !== 1 || !isPathPrim(emitted.primitives[0])) {
    throw new Error(`Ribbon ${source} must lower to exactly one open Path primitive.`);
  }
  return emitted.primitives[0];
};

export type SegmentsFromStepsInput = EmittedPathFromStepsInput & {
  endpointTangents?: { start?: Vector2; end?: Vector2 };
};

/**
 * 从一组 IRStep 生成 ribbon 中心线段与总长度
 * @description boundary 模式的 upper/lower 和 centerline 模式的 children 都走这里，保证 path 解析口径一致
 */
export const segmentsFromSteps = ({
  steps,
  source,
  namespaceStack,
  round,
  measureText,
  options,
  endpointTangents = {},
}: SegmentsFromStepsInput): { segments: Array<RibbonSegment>; totalLength: number } => {
  const prim = emittedPathFromSteps({ steps, source, namespaceStack, round, measureText, options });
  const inputs = commandsToSegmentInputs(prim.commands, source);
  const segments = segmentInputsToSegments(inputs, endpointTangents);
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    throw new Error(`Ribbon ${source} has zero length; at least one nonzero segment is required.`);
  }
  return { segments, totalLength };
};
