import type { PathCommand, PathPrim } from '../../../contract/scene';
import type { IRPosition, IRRibbonCap, RibbonAlignmentValue } from '../../../schemas';
import type { SegmentSample, Vector2 } from '../../../shared/geometry';
import type { NameStack } from '../../name-stack';
import type { PaintResolver } from '../../paint';
import type {
  RibbonAnalyticSegment,
  RibbonCrossSection,
  RibbonLike,
  RibbonSegment,
  RibbonSegmentInput,
} from './types';

import { cubicSegmentSample, lineSegmentSample, quadSegmentSample } from '../../../shared/geometry';
import { resolveShadow } from '../../effects';
import { arcCapPoints, capExtension, isArcCap, midpoint, roundedArcPoints } from './caps';
import {
  alignTangentNormal,
  blendTangent,
  controlHandleLength,
  distance,
  finitePoint,
  normalOf,
  pointAgainstDirection,
  pointOnDirection,
  sampleAtDistance,
} from './centerline';

const ENDPOINT_DIRECTION_BLEND_SPAN = 0.18;

/**
 * 计算中心线某一点的 ribbon 横截面
 * @description 宽度按 offset 求值；align 决定宽度分配到左右两侧的比例；首尾附近会把切线向端点 direction 平滑过渡。
 */
export const ribbonCrossSection = (
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
      ? blendTangent(startTangent, sample.tangent, offset / ENDPOINT_DIRECTION_BLEND_SPAN, 'start blended')
      : offset >= 1 - ENDPOINT_DIRECTION_BLEND_SPAN
        ? blendTangent(endTangent, sample.tangent, (1 - offset) / ENDPOINT_DIRECTION_BLEND_SPAN, 'end blended')
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

const analyticSegmentSample = (segment: RibbonAnalyticSegment, t: number): SegmentSample => {
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

/**
 * 采样型 centerline ribbon 轮廓
 * @description 沿中心线取 sampleCount 个横截面，左侧顺序连线、右侧逆序连线，再按端帽配置闭合。
 */
export const outlineCommands = (
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
    left[0] = [round(left[0][0] - tangents[0][0] * ext), round(left[0][1] - tangents[0][1] * ext)];
    right[0] = [round(right[0][0] - tangents[0][0] * ext), round(right[0][1] - tangents[0][1] * ext)];
  }
  if (endEndpointCap === 'square') {
    const last = sampleCount - 1;
    const ext = capExtension(widths[last], align);
    left[last] = [round(left[last][0] + tangents[last][0] * ext), round(left[last][1] + tangents[last][1] * ext)];
    right[last] = [round(right[last][0] + tangents[last][0] * ext), round(right[last][1] + tangents[last][1] * ext)];
  }

  const commands: Array<PathCommand> = [{ kind: 'move', to: left[0] }];
  for (let i = 1; i < left.length; i += 1) commands.push({ kind: 'line', to: left[i] });
  if (isArcCap(endEndpointCap)) {
    const last = sampleCount - 1;
    for (const point of arcCapPoints(endEndpointCap, left[last], right[last], 'end', nameStack, round)) {
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
    for (const point of arcCapPoints(startEndpointCap, right[0], left[0], 'start', nameStack, round)) {
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

/**
 * 解析型 centerline ribbon 轮廓
 * @description 当中心线仅由 line / quad / cubic 组成且宽度可解析时，尽量保留线段阶数生成左右 offset 命令；
 *   遇到 arc / ellipseArc 或输入不匹配返回 null，由调用方退回采样型轮廓。
 */
export const analyticOutlineCommands = (
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
    const analytic = segmentInputToAnalyticSegment(inputs[index], index, inputs.length, endpointTangentOverrides);
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
    return ribbonCrossSection(sample, offsetAt(segmentIndex, t), widthAt, endpointTangents, align, round);
  };

  const offsetControl = (segmentIndex: number, point: IRPosition, t: number, side: 'left' | 'right'): IRPosition =>
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
      points.push(startSection.left, leftControl, endSection.left, startSection.right, rightControl, endSection.right);
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
    for (const point of arcCapPoints(endEndpointCap, endLeft, endRight, 'end', nameStack, round)) {
      commands.push({ kind: 'line', to: point });
    }
  } else if (endEndpointCap === 'round') {
    for (const point of roundedArcPoints(midpoint(endLeft, endRight, round), endLeft, endRight, endTangent, round)) {
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
    for (const point of arcCapPoints(startEndpointCap, startRight, startLeft, 'start', nameStack, round)) {
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

/**
 * boundary 模式 ribbon 轮廓
 * @description upper / lower 已各自解析成中心线段；这里按同一归一化 offset 采样两条边界，再拼成闭合 path。
 */
export const boundaryOutlineCommands = (
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

/**
 * 将闭合轮廓命令写成最终 PathPrim
 * @description fill 默认 currentColor；仅当用户显式请求 stroke / strokeWidth 时才写描边字段，保持 Scene 输出精简。
 */
export const styledPrimitiveFromOutline = (
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
