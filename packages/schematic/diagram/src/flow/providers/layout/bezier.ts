import type { BoundsRect, Position } from '@retikz/math';
import { curve, DEFAULT_EPSILON } from '@retikz/math';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type {
  EffectiveFlowLayout,
  FlowBezierRoute,
  FlowBezierRouting,
  FlowLayoutRelationInput,
  FlowLayoutRelationOutput,
  FlowLayoutRouting,
} from '../../contract';
import { doFlowBoundsOverlap, findFlowCurveObstacleIntervals } from '../../shared/geometry';
import type { flowRelationObstacles } from './geometry';
import { createFlowBezierCurve, flowRouteLabelBounds } from './geometry';

/** 识别需要候选择优的曲线输入，供布局与诊断共享标签顺序 */
export const isFlowAutomaticRouting = (routing: FlowLayoutRouting): boolean =>
  routing.kind === 'curve'
    ? routing.control === undefined
    : routing.kind === 'cubic'
      ? routing.control1 === undefined
      : routing.kind === 'bend' &&
        !('outAngle' in routing) &&
        (routing.bendAngle === undefined || routing.bendDirection === undefined);

/** 当前关系可见的其他标签，排除尚未求解的自动关系 */
export const flowPriorLabelReservations = (
  relations: ReadonlyArray<FlowLayoutRelationInput>,
  outputs: ReadonlyArray<FlowLayoutRelationOutput>,
  index: number,
): Array<Readonly<{ id: string; bounds: Readonly<BoundsRect> }>> =>
  outputs.flatMap((output, otherIndex) =>
    otherIndex !== index &&
    output.labelBounds !== undefined &&
    (otherIndex < index || !isFlowAutomaticRouting(relations[otherIndex].routing))
      ? [{ id: `relation:${otherIndex}`, bounds: output.labelBounds }]
      : [],
  );

/** 将不可构造的自动路线定位到作者关系 */
const unavailable = (relation: FlowLayoutRelationInput, relationIndex: number): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowBezierRouteUnavailable,
    message: 'Flow Bezier route requires distinct finite endpoint centers and finite controls.',
    details: { path: ['relations', relationIndex, 'routing'], relatedIds: [relation.source, relation.target] },
  });
};

/** 保留显式控制点，自动模式先生成同 kind 共线基线 */
export const createFlowBezierBaseline = (
  routing: FlowBezierRouting,
  points: FlowBezierRoute['points'],
  relation: FlowLayoutRelationInput,
  relationIndex: number,
): FlowBezierRoute => {
  const [from, to] = points;
  if (routing.kind === 'curve' && routing.control !== undefined)
    return { kind: routing.kind, control: routing.control, points };
  if (routing.kind === 'cubic' && routing.control1 !== undefined)
    return { kind: routing.kind, control1: routing.control1, control2: routing.control2, points };
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (!Number.isFinite(length) || length <= DEFAULT_EPSILON) return unavailable(relation, relationIndex);
  const along = (parameter: number): Position => [
    from[0] * (1 - parameter) + to[0] * parameter,
    from[1] * (1 - parameter) + to[1] * parameter,
  ];
  return routing.kind === 'curve'
    ? { kind: 'curve', points, control: along(0.5) }
    : { kind: 'cubic', points, control1: along(1 / 3), control2: along(2 / 3) };
};

/** 贝塞尔节点与标签冲突；障碍盒用于下一轮候选，不持久化 */
export const evaluateFlowBezierConflicts = (
  route: FlowBezierRoute,
  relation: FlowLayoutRelationInput,
  obstacles: ReturnType<typeof flowRelationObstacles>,
  labels: ReturnType<typeof flowPriorLabelReservations>,
) => {
  const segment = createFlowBezierCurve(route);
  const labelBounds = flowRouteLabelBounds(route, relation);
  const blockers: Array<Readonly<BoundsRect>> = [];
  const relatedIds = new Set<string>();
  let nodes = 0,
    labelConflicts = 0;
  for (const obstacle of obstacles) {
    if (
      findFlowCurveObstacleIntervals(
        segment,
        obstacle.bounds,
        obstacle.id === relation.source,
        obstacle.id === relation.target,
      ).length > 0
    ) {
      nodes++;
      blockers.push(obstacle.bounds);
      relatedIds.add(obstacle.id);
    }
    if (labelBounds !== undefined && doFlowBoundsOverlap(labelBounds, obstacle.bounds)) {
      labelConflicts++;
      blockers.push(obstacle.bounds);
      relatedIds.add(obstacle.id);
    }
  }
  for (const label of labels) {
    if (findFlowCurveObstacleIntervals(segment, label.bounds).length > 0) {
      labelConflicts++;
      blockers.push(label.bounds);
      relatedIds.add(label.id);
    }
    if (labelBounds !== undefined && doFlowBoundsOverlap(labelBounds, label.bounds)) {
      labelConflicts++;
      blockers.push(label.bounds);
      relatedIds.add(label.id);
    }
  }
  return { nodes, labelConflicts, blockers, relatedIds: [...relatedIds], labelBounds };
};

/** 固定两轮目标反求，完整比较本轮后才允许早停 */
export const selectFlowBezierRoute = (
  initial: FlowBezierRoute,
  relation: FlowLayoutRelationInput,
  layout: EffectiveFlowLayout,
  obstacles: ReturnType<typeof flowRelationObstacles>,
  labels: ReturnType<typeof flowPriorLabelReservations>,
): FlowLayoutRelationOutput => {
  const [from, to] = initial.points;
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const tangent: Position = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
  const normal: Position = [tangent[1], -tangent[0]];
  const project = (point: Readonly<Position>, direction: Position): number =>
    (point[0] - from[0]) * direction[0] + (point[1] - from[1]) * direction[1];
  const evaluate = (route: FlowBezierRoute) => {
    const conflicts = evaluateFlowBezierConflicts(route, relation, obstacles, labels);
    const segment = createFlowBezierCurve(route);
    const range = curve.projectedRange(segment, normal);
    const origin = from[0] * normal[0] + from[1] * normal[1];
    return {
      route,
      ...conflicts,
      score: [
        conflicts.nodes,
        conflicts.labelConflicts,
        curve.approximateLength(segment, { sampleCount: 32 }),
        Math.max(Math.abs(range.min - origin), Math.abs(range.max - origin)),
      ],
    };
  };
  let best = evaluate(initial);
  const blockers = new Set<Readonly<BoundsRect>>();
  const consider = (route: FlowBezierRoute): void => {
    const candidate = evaluate(route);
    if (candidate.score.some(value => !Number.isFinite(value))) return;
    const difference = candidate.score.findIndex((value, index) => value !== best.score[index]);
    if (difference >= 0 && candidate.score[difference] < best.score[difference]) best = candidate;
  };
  for (let wave = 0; wave < 2 && (best.nodes > 0 || best.labelConflicts > 0); wave++) {
    for (const box of best.blockers) blockers.add(box);
    const corners = [...blockers].flatMap(
      box =>
        [
          [box.x, box.y],
          [box.x + box.width, box.y],
          [box.x, box.y + box.height],
          [box.x + box.width, box.y + box.height],
        ] satisfies Array<Position>,
    );
    const longitudinal = corners.map(point => project(point, tangent));
    const transverse = corners.map(point => project(point, normal));
    const x = Math.max(
      length / 4,
      Math.min((length * 3) / 4, (Math.min(...longitudinal) + Math.max(...longitudinal)) / 2),
    );
    const clearance = (Math.max(layout.nodeGap, layout.rankGap, 1) / 2) * (wave + 1);
    for (const side of [1, -1]) {
      const y = side === 1 ? Math.max(...transverse) + clearance : Math.min(...transverse) - clearance;
      for (const parameter of [0.25, 0.5, 0.75]) {
        const inverse = 1 - parameter;
        const world = (along: number, across: number): Position => [
          from[0] + along * tangent[0] + across * normal[0],
          from[1] + along * tangent[1] + across * normal[1],
        ];
        if (initial.kind === 'curve') {
          const controlX = (x - parameter * parameter * length) / (2 * inverse * parameter),
            controlY = y / (2 * inverse * parameter);
          const control = world(controlX, controlY);
          if (
            control.every(Number.isFinite) &&
            Math.hypot(controlX, controlY) <= 4 * length &&
            Math.hypot(controlX - length, controlY) <= 4 * length
          )
            consider({ ...initial, control });
          continue;
        }
        for (const [outAngle, inAngle] of [
          [30, -30],
          [60, -60],
          [60, 30],
          [-30, -60],
        ]) {
          const out = (outAngle * side * Math.PI) / 180,
            into = (inAngle * side * Math.PI) / 180;
          const first = 3 * inverse * inverse * parameter,
            second = 3 * inverse * parameter * parameter;
          const ax = first * Math.cos(out),
            ay = first * Math.sin(out),
            bx = -second * Math.cos(into),
            by = -second * Math.sin(into);
          const determinant = ax * by - ay * bx;
          if (Math.abs(determinant) <= DEFAULT_EPSILON) continue;
          const remainderX = x - (second + parameter ** 3) * length;
          const a = (remainderX * by - y * bx) / determinant,
            b = (ax * y - ay * remainderX) / determinant;
          if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0 || a > 4 * length || b > 4 * length)
            continue;
          const control1 = world(a * Math.cos(out), a * Math.sin(out)),
            control2 = world(length - b * Math.cos(into), -b * Math.sin(into));
          if (control1.every(Number.isFinite) && control2.every(Number.isFinite))
            consider({ ...initial, control1, control2 });
        }
      }
    }
  }
  return { route: best.route, ...(best.labelBounds === undefined ? {} : { labelBounds: best.labelBounds }) };
};
