import type { IRPosition, IRRibbonArcCap, IRRibbonCap, RibbonAlignmentValue } from '../../../schemas';
import type { Vector2 } from '../../../shared/geometry';
import type { NameStack } from '../../name-stack';

import { resolvePosition } from '../../position';

const ARC_CAP_POINT_COUNT = 8;

const distance = (a: IRPosition, b: IRPosition): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy);
};

export const roundedArcPoints = (
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
    points.push([round(center[0] + Math.cos(angle) * radius), round(center[1] + Math.sin(angle) * radius)]);
  }
  return points;
};

export const isArcCap = (cap: IRRibbonCap): cap is IRRibbonArcCap => typeof cap === 'object';

export const assertArcCapRadius = (
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

export const arcCapPoints = (
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
    points.push([round(center[0] + Math.cos(angle) * cap.radius), round(center[1] + Math.sin(angle) * cap.radius)]);
  }
  return points;
};

export const midpoint = (a: IRPosition, b: IRPosition, round: (n: number) => number): IRPosition => [
  round((a[0] + b[0]) / 2),
  round((a[1] + b[1]) / 2),
];

export const capExtension = (width: number, align: RibbonAlignmentValue): number => {
  if (align === 'center') return width / 2;
  return width;
};