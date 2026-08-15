import type { IRPosition, PathCommand, SegmentSample } from '@retikz/core';
import type { Vector2 } from '@retikz/math';

import { cubicSegmentSample, lineSegmentSample, quadSegmentSample } from '@retikz/core';
import { point } from '@retikz/math';

import type { IRRibbonCap, RibbonAlignmentValue } from '../../types';
import type { RibbonAnalyticSegment, RibbonCrossSection, RibbonSegment, RibbonSegmentInput } from '../types';

import { arcCapPoints, capExtension, isArcCap, midpoint, roundedArcPoints } from '../caps';
import { controlHandleLength } from '../centerline';
import { ribbonCrossSection } from './cross-section';

type SegmentInputToAnalyticSegmentInput = {
  input: RibbonSegmentInput;
  index: number;
  count: number;
  endpointTangents?: { start?: Vector2; end?: Vector2 };
};

const segmentInputToAnalyticSegment = ({
  input,
  index,
  count,
  endpointTangents = {},
}: SegmentInputToAnalyticSegmentInput): RibbonAnalyticSegment | null => {
  const isFirst = index === 0;
  const isLast = index === count - 1;
  if (input.kind === 'line') return input;
  if (input.kind === 'quad') {
    if ((isFirst && endpointTangents.start) || (isLast && endpointTangents.end)) {
      const fallback = point.distance(input.from, input.to) / 3;
      const control1Length = (controlHandleLength(input.from, input.control, fallback) * 2) / 3;
      const control2Length = (controlHandleLength(input.to, input.control, fallback) * 2) / 3;
      return {
        kind: 'cubic',
        from: input.from,
        control1:
          isFirst && endpointTangents.start
            ? point.along(input.from, endpointTangents.start, control1Length)
            : [
                input.from[0] + ((input.control[0] - input.from[0]) * 2) / 3,
                input.from[1] + ((input.control[1] - input.from[1]) * 2) / 3,
              ],
        control2:
          isLast && endpointTangents.end
            ? point.against(input.to, endpointTangents.end, control2Length)
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
    const fallback = point.distance(input.from, input.to) / 3;
    return {
      kind: 'cubic',
      from: input.from,
      control1:
        isFirst && endpointTangents.start
          ? point.along(input.from, endpointTangents.start, controlHandleLength(input.from, input.control1, fallback))
          : input.control1,
      control2:
        isLast && endpointTangents.end
          ? point.against(input.to, endpointTangents.end, controlHandleLength(input.to, input.control2, fallback))
          : input.control2,
      to: input.to,
    };
  }
  return null;
};

const analyticSegmentSample = (segment: RibbonAnalyticSegment, t: number): SegmentSample => {
  if (segment.kind === 'line') return lineSegmentSample(segment.from, segment.to, t);
  if (segment.kind === 'quad') return quadSegmentSample(segment.from, segment.control, segment.to, t);
  return cubicSegmentSample(segment.from, segment.control1, segment.control2, segment.to, t);
};

type OffsetAnalyticPointInput = {
  point: IRPosition;
  sample: SegmentSample;
  offset: number;
  side: 'left' | 'right';
  widthAt: (offset: number) => number;
  endpointTangents: { start: Vector2; end: Vector2 };
  align: RibbonAlignmentValue;
  round: (n: number) => number;
};

const offsetAnalyticPoint = ({
  point: sourcePoint,
  sample,
  offset,
  side,
  widthAt,
  endpointTangents,
  align,
  round,
}: OffsetAnalyticPointInput): IRPosition => {
  const section = ribbonCrossSection({
    sample: { point: sourcePoint, tangent: sample.tangent },
    offset,
    widthAt,
    endpointTangents,
    align,
    round,
  });
  return side === 'left' ? section.left : section.right;
};

export type AnalyticOutlineCommandsInput = {
  inputs: ReadonlyArray<RibbonSegmentInput>;
  segments: ReadonlyArray<RibbonSegment>;
  totalLength: number;
  widthAt: (offset: number) => number;
  endpointTangents: { start: Vector2; end: Vector2 };
  endpointTangentOverrides: { start?: Vector2; end?: Vector2 };
  align: RibbonAlignmentValue;
  startEndpointCap: IRRibbonCap;
  endEndpointCap: IRRibbonCap;
  round: (n: number) => number;
};

/**
 * 解析型 centerline ribbon 轮廓
 * @description 当中心线仅由 line / quad / cubic 组成且宽度可解析时，尽量保留线段阶数生成左右 offset 命令；
 *   遇到 arc / ellipseArc 或输入不匹配返回 null，由调用方退回采样型轮廓
 */
export const analyticOutlineCommands = ({
  inputs,
  segments,
  totalLength,
  widthAt,
  endpointTangents,
  endpointTangentOverrides,
  align,
  startEndpointCap,
  endEndpointCap,
  round,
}: AnalyticOutlineCommandsInput): { commands: Array<PathCommand>; points: Array<IRPosition> } | null => {
  if (inputs.length !== segments.length) return null;

  const analyticSegments: Array<RibbonAnalyticSegment> = [];
  for (let index = 0; index < inputs.length; index += 1) {
    const analytic = segmentInputToAnalyticSegment({
      input: inputs[index],
      index,
      count: inputs.length,
      endpointTangents: endpointTangentOverrides,
    });
    if (analytic === null) return null;
    analyticSegments.push(analytic);
  }

  const leftCommands: Array<PathCommand> = [];
  const rightCommands: Array<PathCommand> = [];
  const points: Array<IRPosition> = [];
  const offsetAt = (segmentIndex: number, t: number): number => {
    const lengthBefore = segments.slice(0, segmentIndex).reduce((sum, segment) => sum + segment.length, 0);
    return (lengthBefore + segments[segmentIndex].length * t) / totalLength;
  };

  const sectionAt = (segmentIndex: number, t: number): RibbonCrossSection => {
    const sample = analyticSegmentSample(analyticSegments[segmentIndex], t);
    return ribbonCrossSection({ sample, offset: offsetAt(segmentIndex, t), widthAt, endpointTangents, align, round });
  };

  const offsetControl = ({
    segmentIndex,
    point: controlPoint,
    t,
    side,
  }: {
    segmentIndex: number;
    point: IRPosition;
    t: number;
    side: 'left' | 'right';
  }): IRPosition =>
    offsetAnalyticPoint({
      point: controlPoint,
      sample: analyticSegmentSample(analyticSegments[segmentIndex], t),
      offset: offsetAt(segmentIndex, t),
      side,
      widthAt,
      endpointTangents,
      align,
      round,
    });

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
      const leftControl = offsetControl({ segmentIndex: index, point: segment.control, t: 0.5, side: 'left' });
      const rightControl = offsetControl({ segmentIndex: index, point: segment.control, t: 0.5, side: 'right' });
      leftCommands.push({ kind: 'quad', control: leftControl, to: endSection.left });
      rightCommands.push({ kind: 'quad', control: rightControl, to: startSection.right });
      points.push(startSection.left, leftControl, endSection.left, startSection.right, rightControl, endSection.right);
    } else {
      const leftControl1 = offsetControl({ segmentIndex: index, point: segment.control1, t: 1 / 3, side: 'left' });
      const leftControl2 = offsetControl({ segmentIndex: index, point: segment.control2, t: 2 / 3, side: 'left' });
      const rightControl1 = offsetControl({ segmentIndex: index, point: segment.control1, t: 1 / 3, side: 'right' });
      const rightControl2 = offsetControl({ segmentIndex: index, point: segment.control2, t: 2 / 3, side: 'right' });
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
    startLeft = [round(startLeft[0] - startTangent[0] * ext), round(startLeft[1] - startTangent[1] * ext)];
    startRight = [round(startRight[0] - startTangent[0] * ext), round(startRight[1] - startTangent[1] * ext)];
  }
  if (endEndpointCap === 'square') {
    const ext = capExtension(endWidth, align);
    endLeft = [round(endLeft[0] + endTangent[0] * ext), round(endLeft[1] + endTangent[1] * ext)];
    endRight = [round(endRight[0] + endTangent[0] * ext), round(endRight[1] + endTangent[1] * ext)];
  }

  const commands: Array<PathCommand> = [{ kind: 'move', to: startLeft }];
  commands.push(...leftCommands);
  const lastLeftCommand = commands[commands.length - 1];
  if ('to' in lastLeftCommand) lastLeftCommand.to = endLeft;
  if (isArcCap(endEndpointCap)) {
    for (const capPoint of arcCapPoints({
      cap: endEndpointCap,
      from: endLeft,
      to: endRight,
      endpoint: 'end',
      round,
    })) {
      commands.push({ kind: 'line', to: capPoint });
    }
  } else if (endEndpointCap === 'round') {
    for (const capPoint of roundedArcPoints({
      center: midpoint(endLeft, endRight, round),
      from: endLeft,
      to: endRight,
      outwardDirection: endTangent,
      round,
    })) {
      commands.push({ kind: 'line', to: capPoint });
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
    for (const capPoint of arcCapPoints({
      cap: startEndpointCap,
      from: startRight,
      to: startLeft,
      endpoint: 'start',
      round,
    })) {
      commands.push({ kind: 'line', to: capPoint });
    }
  } else if (startEndpointCap === 'round') {
    for (const capPoint of roundedArcPoints({
      center: midpoint(startLeft, startRight, round),
      from: startRight,
      to: startLeft,
      outwardDirection: [-startTangent[0], -startTangent[1]],
      round,
    })) {
      commands.push({ kind: 'line', to: capPoint });
    }
  }
  commands.push({ kind: 'close' });
  return { commands, points: [...points, startLeft, startRight, endLeft, endRight] };
};
