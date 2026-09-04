import type { IRPosition, PathCommand } from '@retikz/core';
import type { CurveSegmentSample, Vector2 } from '@retikz/math';

import { isPositionTuple, polar } from '@retikz/core';
import { curve, point, vector2 } from '@retikz/math';

import type { IRRibbonDirection } from '../types';
import type { RibbonSegment, RibbonSegmentInput } from './types';

import { RetikzStandardError, RetikzStandardErrorCode } from '../../errors';

const LENGTH_SUBDIVISIONS = 16;

const assertCursor = (cursor: IRPosition | undefined, command: PathCommand): IRPosition => {
  if (cursor !== undefined) return cursor;
  throw new RetikzStandardError({
    code: RetikzStandardErrorCode.GeometryInvalid,
    message: `Ribbon centerline command "${command.kind}" has no current point; start with a move step.`,
    details: { command: command.kind },
  });
};

/** 校验并归一化 ribbon 方向向量；零向量或非有限值直接报错 */
export const normalizeVector = (vector: Vector2, source: string): Vector2 => {
  const normalized = vector2.normalizeOrNull(vector);
  if (normalized === null) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.GeometryInvalid,
      message: `Ribbon ${source} direction must be a finite nonzero vector.`,
      details: { source, vector },
    });
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
    return normalizeVector(direction, source);
  }
  try {
    return normalizeVector(polar.toPosition(direction), source);
  } catch (cause) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.GeometryInvalid,
      message: `Ribbon ${source} direction PolarPosition cannot use a string origin; use an angle or explicit vector instead.`,
      details: { source },
      cause,
    });
  }
};

/** 用固定细分估算曲线弧长，供 offset→segment 映射和采样数量选择使用 */
export const estimateLength = (sampleAt: (t: number) => CurveSegmentSample): number => {
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
          throw new RetikzStandardError({
            code: RetikzStandardErrorCode.GeometryInvalid,
            message: `Ribbon ${source} must be a single open subpath; multiple move commands are not supported.`,
            details: { moveCount, source },
          });
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
        const sampleAt = (t: number): CurveSegmentSample =>
          curve.sampleAt({ kind: 'quadraticBezier', from, control: command.control, to: command.to }, t);
        if (estimateLength(sampleAt) > 0) {
          inputs.push({ kind: 'quad', from, control: command.control, to: command.to });
        }
        cursor = command.to;
        break;
      }
      case 'cubic': {
        const from = assertCursor(cursor, command);
        const sampleAt = (t: number): CurveSegmentSample =>
          curve.sampleAt(
            { kind: 'cubicBezier', from, control1: command.control1, control2: command.control2, to: command.to },
            t,
          );
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
        const sampleAt = (t: number): CurveSegmentSample =>
          curve.sampleAt(
            {
              kind: 'arc',
              center: command.center,
              radius: command.radius,
              startAngleDeg: command.startAngle,
              endAngleDeg: command.endAngle,
            },
            t,
          );
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
        const sampleAt = (t: number): CurveSegmentSample =>
          curve.sampleAt(
            {
              kind: 'ellipseArc',
              center: command.center,
              radiusX: command.radiusX,
              radiusY: command.radiusY,
              startAngleDeg: command.startAngle,
              endAngleDeg: command.endAngle,
            },
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
        throw new RetikzStandardError({
          code: RetikzStandardErrorCode.GeometryInvalid,
          message: `Ribbon ${source} must be open; close/cycle is not supported.`,
          details: { command: command.kind, source },
        });
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
}: SegmentToSamplerInput): ((t: number) => CurveSegmentSample) => {
  const isFirst = index === 0;
  const isLast = index === count - 1;
  if (input.kind === 'line') {
    return (t: number): CurveSegmentSample => curve.sampleAt({ kind: 'line', from: input.from, to: input.to }, t);
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
      return (t: number): CurveSegmentSample =>
        curve.sampleAt({ kind: 'cubicBezier', from: input.from, control1, control2, to: input.to }, t);
    }
    return (t: number): CurveSegmentSample =>
      curve.sampleAt({ kind: 'quadraticBezier', from: input.from, control: input.control, to: input.to }, t);
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
    return (t: number): CurveSegmentSample =>
      curve.sampleAt({ kind: 'cubicBezier', from: input.from, control1, control2, to: input.to }, t);
  }
  if (input.kind === 'arc') {
    return (t: number): CurveSegmentSample =>
      curve.sampleAt(
        {
          kind: 'arc',
          center: input.center,
          radius: input.radius,
          startAngleDeg: input.startAngle,
          endAngleDeg: input.endAngle,
        },
        t,
      );
  }
  return (t: number): CurveSegmentSample =>
    curve.sampleAt(
      {
        kind: 'ellipseArc',
        center: input.center,
        radiusX: input.radiusX,
        radiusY: input.radiusY,
        startAngleDeg: input.startAngle,
        endAngleDeg: input.endAngle,
      },
      t,
    );
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
): CurveSegmentSample => {
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

export type SegmentsFromCommandsInput = {
  commands: ReadonlyArray<PathCommand>;
  source: string;
  endpointTangents?: { start?: Vector2; end?: Vector2 };
};

/**
 * 从 Core materializePath 的结构化命令生成 ribbon 中心线段与总长度
 * @description Standard 只消费 Core public materializePath 服务返回的 renderer-neutral commands
 */
export const segmentsFromCommands = ({
  commands,
  source,
  endpointTangents = {},
}: SegmentsFromCommandsInput): { segments: Array<RibbonSegment>; totalLength: number } => {
  const inputs = commandsToSegmentInputs(commands, source);
  const segments = segmentInputsToSegments(inputs, endpointTangents);
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.GeometryInvalid,
      message: `Ribbon ${source} has zero length; at least one nonzero segment is required.`,
      details: { source, totalLength },
    });
  }
  return { segments, totalLength };
};
