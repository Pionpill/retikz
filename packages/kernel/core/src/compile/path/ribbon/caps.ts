import type { Vector2 } from '@retikz/math';

import { point } from '@retikz/math';

import type { IRPosition, IRRibbonArcCap, IRRibbonCap, RibbonAlignmentValue } from '../../../schemas';
import type { NamespaceStack } from '../../namespace';

import { resolvePosition } from '../../position';

const ARC_CAP_POINT_COUNT = 8;

export type RoundedArcPointsInput = {
  center: IRPosition;
  from: IRPosition;
  to: IRPosition;
  outwardDirection: Vector2;
  round: (n: number) => number;
};

/**
 * 生成 round cap 的离散圆弧点
 * @description 在左右边界点之间选择朝 outwardDirection 外凸的那段圆弧，避免圆头反向穿过 ribbon 内部。
 */
export const roundedArcPoints = ({
  center,
  from,
  to,
  outwardDirection,
  round,
}: RoundedArcPointsInput): Array<IRPosition> => {
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
  const radius = point.distance(center, from);
  const points: Array<IRPosition> = [];
  for (let i = 1; i <= ARC_CAP_POINT_COUNT; i += 1) {
    const angle = start + (delta * i) / ARC_CAP_POINT_COUNT;
    points.push([round(center[0] + Math.cos(angle) * radius), round(center[1] + Math.sin(angle) * radius)]);
  }
  return points;
};

/** 判定是否为显式圆弧端帽配置。 */
export const isArcCap = (cap: IRRibbonCap): cap is IRRibbonArcCap => typeof cap === 'object';

type AssertArcCapRadiusInput = {
  actual: number;
  expected: number;
  endpoint: 'start' | 'end';
  side: 'first' | 'second';
};

/** 校验显式 arc cap 的圆心和半径能同时经过端面两侧点。 */
export const assertArcCapRadius = ({ actual, expected, endpoint, side }: AssertArcCapRadiusInput): void => {
  const tolerance = Math.max(0.01, Math.abs(expected) * 1e-4);
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Ribbon ${endpoint} arc cap radius must reach the ${side} side point; expected ${String(expected)}, got ${String(actual)}.`,
    );
  }
};

export type ArcCapPointsInput = {
  cap: IRRibbonArcCap;
  from: IRPosition;
  to: IRPosition;
  endpoint: 'start' | 'end';
  namespaceStack: NamespaceStack;
  round: (n: number) => number;
};

/**
 * 解析显式 arc cap 并生成离散圆弧点
 * @description cap.center 可引用节点 / 坐标；半径必须与端面两侧点一致，否则端帽无法闭合。
 */
export const arcCapPoints = ({
  cap,
  from,
  to,
  endpoint,
  namespaceStack,
  round,
}: ArcCapPointsInput): Array<IRPosition> => {
  const resolvedCenter = resolvePosition(cap.center, { namespaceStack });
  if (resolvedCenter === null) {
    throw new Error(`Ribbon ${endpoint} arc cap center could not be resolved.`);
  }
  const center: IRPosition = [round(resolvedCenter[0]), round(resolvedCenter[1])];
  assertArcCapRadius({ actual: point.distance(center, from), expected: cap.radius, endpoint, side: 'first' });
  assertArcCapRadius({ actual: point.distance(center, to), expected: cap.radius, endpoint, side: 'second' });

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
    points.push([round(center[0] + Math.cos(angle) * cap.radius), round(center[1] + Math.sin(angle) * cap.radius)]);
  }
  return points;
};

/** 端面两侧点的中点。 */
export const midpoint = (a: IRPosition, b: IRPosition, round: (n: number) => number): IRPosition => [
  round((a[0] + b[0]) / 2),
  round((a[1] + b[1]) / 2),
];

/** square cap 沿切线方向外扩的距离；center 对齐只需半宽，left/right 对齐需整宽。 */
export const capExtension = (width: number, align: RibbonAlignmentValue): number => {
  if (align === 'center') return width / 2;
  return width;
};
