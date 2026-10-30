import { curve, point, vector2 } from '@retikz/math';

import type { CompiledArrowEnd, PathCommand } from '../../../contract';
import type { IRPosition } from '../../../schemas';
import type { StrokeCommandOccurrence } from './interruption';
import { createStrokePathGeometry, curveSegmentOfOccurrence, sliceOccurrenceCommand } from './interruption';

/** 路径首尾箭头 */
export type EndpointArrowSpecs = {
  /** 首端箭头及其局部几何 */
  arrowStart?: CompiledArrowEnd;
  /** 末端箭头及其局部几何 */
  arrowEnd?: CompiledArrowEnd;
};

/** 接合点在原始路径中的参数位置 */
type EndpointContact = {
  /** 原曲线命令序号 */
  index: number;
  /** 接合点的曲线参数 */
  parameter: number;
  /** 接合点坐标 */
  position: IRPosition;
  /** 从接合点向外指向目标的方向 */
  direction: IRPosition;
  /** 路径不足以容纳箭头时的等比缩放 */
  scale: number;
};

/** 从端点向内查找与目标距离等于箭头接合长度的第一个位置 */
const findContact = (
  occurrences: ReadonlyArray<StrokeCommandOccurrence>,
  start: boolean,
  distance: number,
): EndpointContact => {
  const endpointIndex = start ? 0 : occurrences.length - 1;
  const endpoint = occurrences[endpointIndex];
  const parameter = start ? 0 : 1;
  const origin = curve.sampleAt(curveSegmentOfOccurrence(endpoint), parameter);
  const outward: IRPosition = start ? [-origin.tangent[0], -origin.tangent[1]] : origin.tangent;
  let best: EndpointContact = { index: endpointIndex, parameter, position: origin.point, direction: outward, scale: 1 };
  if (distance <= 0) {
    return { ...best, position: [origin.point[0] - outward[0] * distance, origin.point[1] - outward[1] * distance] };
  }
  best.scale = 0;
  let farthest = 0;
  for (let index = endpointIndex; index >= 0 && index < occurrences.length; index += start ? 1 : -1) {
    const occurrence = occurrences[index];
    if (occurrence.subPathIndex !== endpoint.subPathIndex) break;
    const segment = curveSegmentOfOccurrence(occurrence);
    let inside = start ? 0 : 1;
    for (let step = 1; step <= 128; step++) {
      const outside = start ? step / 128 : 1 - step / 128;
      const sample = curve.sampleAt(segment, outside);
      const separation = point.distance(sample.point, origin.point);
      if (separation > farthest) {
        farthest = separation;
        best = {
          index,
          parameter: outside,
          position: sample.point,
          direction: vector2.sub(origin.point, sample.point),
          scale: Math.min(1, separation / distance),
        };
      }
      if (separation >= distance) {
        let high = outside;
        let low = inside;
        for (let iteration = 0; iteration < 48; iteration++) {
          const middle = (low + high) / 2;
          if (point.distance(curve.sampleAt(segment, middle).point, origin.point) < distance) low = middle;
          else high = middle;
        }
        const cut = (low + high) / 2;
        const position = curve.sampleAt(segment, cut).point;
        return { index, parameter: cut, position, direction: vector2.sub(origin.point, position), scale: 1 };
      }
      inside = outside;
    }
  }
  return best;
};

/** 在 marker 局部坐标中补偿宿主切线，使箭头连接原曲线断点与目标 */
const orientArrow = (
  spec: CompiledArrowEnd | undefined,
  contact: EndpointContact,
  tangent: IRPosition,
  start: boolean,
): CompiledArrowEnd | undefined => {
  if (spec === undefined || contact.scale <= 1e-10) return undefined;
  const nativeAngle = Math.atan2(tangent[1], tangent[0]) + (start ? Math.PI : 0);
  const angle = Math.atan2(contact.direction[1], contact.direction[0]) - nativeAngle;
  const width = spec.markerWidth * contact.scale;
  const height = spec.markerHeight * contact.scale;
  if (Math.abs(angle) < 1e-10) return { ...spec, markerWidth: width, markerHeight: height };
  // S^-1 R S 抵消 marker 的非等比宽高，旋转中心固定在线接触点
  const sx = width / spec.baseSize;
  const sy = height / spec.baseSize;
  return {
    ...spec,
    markerWidth: width,
    markerHeight: height,
    marker: [
      {
        type: 'group',
        transforms: [
          { kind: 'translate', x: spec.refX, y: spec.baseSize / 2 },
          { kind: 'scale', x: 1 / sx, y: 1 / sy },
          { kind: 'rotate', degrees: (angle * 180) / Math.PI },
          { kind: 'scale', x: sx, y: sy },
          { kind: 'translate', x: -spec.refX, y: -spec.baseSize / 2 },
        ],
        children: spec.marker,
      },
    ],
  };
};

/** 保形截取首尾路径，并将 marker 朝向对齐到接合点与目标之间 */
export const shortenEndpointContacts = (
  commands: Array<PathCommand>,
  context: EndpointArrowSpecs & {
    /** 起点接合长度的线宽系数 */
    shrinkStart: number;
    /** 终点接合长度的线宽系数 */
    shrinkEnd: number;
    /** 路径线宽 */
    strokeWidth: number;
    /** 输出坐标精度 */
    round: (value: number) => number;
  },
): EndpointArrowSpecs => {
  const { round, strokeWidth } = context;
  if (context.shrinkStart === 0 && context.shrinkEnd === 0) {
    return { arrowStart: context.arrowStart, arrowEnd: context.arrowEnd };
  }
  const occurrences = createStrokePathGeometry(
    commands,
    commands.map(() => 0),
  ).occurrences.filter(item => item.command.kind !== 'close');
  if (occurrences.length === 0) return {};
  if (occurrences.every(item => item.logicalEnd - item.logicalStart <= 1e-10)) return {};
  let startDistance = context.shrinkStart * strokeWidth;
  let endDistance = context.shrinkEnd * strokeWidth;
  const first = occurrences[0];
  const last = occurrences[occurrences.length - 1];
  let startScale = 1;
  let endScale = 1;
  // 很短的双端路径先共同缩小箭头，为两端保留接合空间
  const span = point.distance(first.from, last.to);
  if (
    first.subPathIndex === last.subPathIndex &&
    span > 1e-10 &&
    startDistance > 0 &&
    endDistance > 0 &&
    startDistance + endDistance > span
  ) {
    startScale = endScale = span / (startDistance + endDistance);
    startDistance *= startScale;
    endDistance *= endScale;
  }
  const start = findContact(occurrences, true, startDistance);
  const end = findContact(occurrences, false, endDistance);
  start.scale *= startScale;
  end.scale *= endScale;
  const output: Array<PathCommand> = [];
  for (let index = start.index; index <= end.index; index++) {
    const occurrence = occurrences[index];
    const fromParameter = index === start.index ? start.parameter : 0;
    const toParameter = index === end.index ? end.parameter : 1;
    if (fromParameter > toParameter) continue;
    if (index === start.index) {
      const position = curve.sampleAt(curveSegmentOfOccurrence(occurrence), fromParameter).point;
      output.push({ kind: 'move', to: [round(position[0]), round(position[1])] });
    } else {
      output.push(...commands.slice(occurrences[index - 1].commandIndex + 1, occurrence.commandIndex));
    }
    output.push(sliceOccurrenceCommand(occurrence, fromParameter, toParameter, round));
  }
  if (endDistance === 0) output.push(...commands.slice(last.commandIndex + 1));
  if (output.length === 0) return {};
  if (startDistance < 0) {
    const move = output[0];
    if (move.kind === 'move') {
      output.splice(
        0,
        1,
        { kind: 'move', to: [round(start.position[0]), round(start.position[1])] },
        { kind: 'line', to: move.to },
      );
    }
  }
  if (endDistance < 0) output.push({ kind: 'line', to: [round(end.position[0]), round(end.position[1])] });
  commands.splice(0, commands.length, ...output);
  const shortened = createStrokePathGeometry(
    commands,
    commands.map(() => 0),
  ).occurrences.filter(item => item.command.kind !== 'close');
  const startTangent = curve.sampleAt(curveSegmentOfOccurrence(shortened[0]), 0).tangent;
  const endTangent = curve.sampleAt(curveSegmentOfOccurrence(shortened[shortened.length - 1]), 1).tangent;
  return {
    arrowStart: orientArrow(context.arrowStart, start, startTangent, true),
    arrowEnd: orientArrow(context.arrowEnd, end, endTangent, false),
  };
};
