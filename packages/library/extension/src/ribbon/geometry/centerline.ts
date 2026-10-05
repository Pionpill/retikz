import type { IRPosition, PathCommand } from '@retikz/core';
import { isPositionTuple, polar } from '@retikz/core';
import type { CurveSegment, CurveSegmentSample, Vector2 } from '@retikz/math';
import { curve, point, vector2 } from '@retikz/math';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../../errors';
import type { IRRibbonDirection } from '../types';
import type { RibbonSegment, RibbonSegmentInput } from './types';

const LENGTH_SUBDIVISIONS = 16;

const assertCursor = (cursor: IRPosition | undefined, command: PathCommand): IRPosition => {
  if (cursor !== undefined) return cursor;

  throw new RetikzExtensionError({
    code: RetikzExtensionErrorCode.GeometryInvalid,
    message: `Ribbon centerline command "${command.kind}" has no current point; start with a move step.`,
    details: { command: command.kind },
  });
};

/** 校验并归一化 ribbon 方向向量；零向量或非有限值直接报错 */
export const normalizeVector = (vector: Vector2, source: string): Vector2 => {
  const normalized = vector2.normalizeOrNull(vector);
  if (normalized === null) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
      message: `Ribbon ${source} direction must be a finite nonzero vector.`,
      details: { source, vector },
    });
  }

  return normalized;
};

/**
 * 把 ribbon 端点 direction 解析为端面单位轴
 * @description 支持角度、显式向量和无字符串 origin 的 PolarPosition
 */
export const directionToSectionAxis = (direction: IRRibbonDirection, source: string): Vector2 => {
  if (typeof direction === 'number') {
    return vector2.fromAngleDegrees(direction);
  }

  if (isPositionTuple(direction)) {
    return normalizeVector(direction, source);
  }

  try {
    return normalizeVector(polar.toPosition(direction), source);
  } catch (cause) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
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

/**
 * 将路径命令转换为带状几何的分段输入
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
          throw new RetikzExtensionError({
            code: RetikzExtensionErrorCode.GeometryInvalid,
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
        throw new RetikzExtensionError({
          code: RetikzExtensionErrorCode.GeometryInvalid,
          message: `Ribbon ${source} must be open; close/cycle is not supported.`,
          details: { command: command.kind, source },
        });
    }
  }

  return inputs;
};

/** 将已物化命令投影为 Math 曲线，不改写作者控制柄 */
export const segmentInputToCurve = (input: RibbonSegmentInput): CurveSegment => {
  if (input.kind === 'line') return input;
  if (input.kind === 'quad') return { ...input, kind: 'quadraticBezier' };
  if (input.kind === 'cubic') return { ...input, kind: 'cubicBezier' };

  return { ...input, startAngleDeg: input.startAngle, endAngleDeg: input.endAngle };
};

/** 建立共享弧长采样模型 */
export const segmentInputsToSegments = (inputs: ReadonlyArray<RibbonSegmentInput>): Array<RibbonSegment> =>
  inputs
    .map(input => {
      const geometry = segmentInputToCurve(input);
      const length = curve.approximateLength(geometry);

      return {
        sampleAt: (t: number) => curve.sampleAt(geometry, t),
        sampleAtDistance: (distance: number) =>
          curve.sampleAt(geometry, curve.parameterAtDistance(geometry, distance, { totalLength: length })),
        length,
      };
    })
    .filter(segment => segment.length > 0);

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
      return segment.sampleAtDistance(target - acc);
    }

    acc = end;
  }

  return segments[segments.length - 1].sampleAt(1);
};

/** 把一条开放路径转换为可采样中心线时所需的命令及错误来源标识 */
export type SegmentsFromCommandsInput = {
  /** 用于提取中心线段的结构化路径命令 */
  commands: ReadonlyArray<PathCommand>;
  /** 错误诊断中标识中心线来源的名称 */
  source: string;
};

/**
 * 从 Core materializePath 的结构化命令生成 ribbon 中心线段与总长度
 * @description Extension 只消费 Core public materializePath 服务返回的 renderer-neutral commands
 */
export const segmentsFromCommands = ({
  commands,
  source,
}: SegmentsFromCommandsInput): { segments: Array<RibbonSegment>; totalLength: number } => {
  const inputs = commandsToSegmentInputs(commands, source);
  const segments = segmentInputsToSegments(inputs);
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
      message: `Ribbon ${source} has zero length; at least one nonzero segment is required.`,
      details: { source, totalLength },
    });
  }

  return { segments, totalLength };
};
