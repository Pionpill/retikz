import type { BoundsRect, Position } from '@retikz/math';
import { DEFAULT_EPSILON } from '@retikz/math';

import type {
  EffectiveFlowLayout,
  FlowBendRoute,
  FlowLayoutElementInput,
  FlowLayoutElementOutput,
  FlowLayoutInput,
  FlowLayoutExecutionContext,
  FlowLayoutRelationInput,
  FlowLayoutRelationOutput,
  FlowLayoutRoute,
} from '../../contract';
import { FlowRoutingKind } from '../../shared';
import { FLOW_BEND_ANGLES, doFlowBoundsOverlap, findFlowCurveObstacleIntervals } from '../../shared/geometry';
import {
  createFlowBezierBaseline,
  selectFlowBezierRoute,
  isFlowAutomaticRouting,
  flowPriorLabelReservations,
} from './bezier';
import {
  createFlowBendCurve,
  flowBendGeometryFailure,
  flowRelationObstacles,
  flowRouteLabelBounds,
  scoreFlowBendNodes,
} from './geometry';
import { createFlowOrthogonalCandidates, evaluateFlowOrthogonalConflicts } from './orthogonal';

const centerOf = (bounds: Readonly<BoundsRect>): Position => [
  bounds.x + bounds.width / 2,
  bounds.y + bounds.height / 2,
];

type RoutingIndex = Readonly<{
  scopes: ReadonlyMap<string, ReadonlyArray<string>>;
  layouts: ReadonlyMap<string, EffectiveFlowLayout>;
}>;
const buildRoutingIndex = (elements: ReadonlyArray<FlowLayoutElementInput>): RoutingIndex => {
  const scopes = new Map<string, ReadonlyArray<string>>();
  const layouts = new Map<string, EffectiveFlowLayout>();
  const visit = (items: ReadonlyArray<FlowLayoutElementInput>, ancestors: ReadonlyArray<string>): void => {
    for (const item of items) {
      scopes.set(item.id, ancestors);
      if (item.kind !== 'leaf') {
        layouts.set(item.id, item.layout);
        visit(item.elements, [...ancestors, item.id]);
      }
    }
  };
  visit(elements, []);
  return { scopes, layouts };
};

const commonScope = (source: ReadonlyArray<string>, target: ReadonlyArray<string>): string | undefined => {
  let result: string | undefined;
  for (let index = 0; index < Math.min(source.length, target.length); index += 1) {
    if (source[index] !== target[index]) break;
    result = source[index];
  }
  return result;
};

const collapsePoints = (points: ReadonlyArray<Readonly<Position>>): ReadonlyArray<Readonly<Position>> =>
  points.filter(
    (point, index) => index === 0 || point[0] !== points[index - 1]?.[0] || point[1] !== points[index - 1]?.[1],
  );

const labelBoundsFor = (
  points: ReadonlyArray<Readonly<Position>>,
  size: NonNullable<FlowLayoutRelationInput['labelSize']>,
): Readonly<BoundsRect> => {
  const lengths = points.slice(1).map((point, index) => {
    const previous = points[index];
    return Math.abs(point[0] - previous[0]) + Math.abs(point[1] - previous[1]);
  });
  const midpoint = lengths.reduce((total, length) => total + length, 0) / 2;
  let travelled = 0;
  let selectedIndex = 0;
  for (const [index, length] of lengths.entries()) {
    if (travelled + length >= midpoint) {
      selectedIndex = index;
      break;
    }
    travelled += length;
  }
  const source = points[selectedIndex] ?? [0, 0];
  const target = points[selectedIndex + 1] ?? source;
  const length = lengths[selectedIndex] ?? 0;
  const ratio = length === 0 ? 0 : (midpoint - travelled) / length;
  const horizontal = source[1] === target[1];
  const centerX = source[0] + (target[0] - source[0]) * ratio;
  const centerY = source[1] + (target[1] - source[1]) * ratio;
  const gap = 4;
  return {
    x: centerX - size.width / 2 + (horizontal ? 0 : gap),
    y: centerY - size.height / 2 - (horizontal ? gap : 0),
    width: size.width,
    height: size.height,
  };
};

/** 基于完整的根局部元素边界计算关系路线和标签预留，不改变输入或元素位置
 * @param input 已测量的布局输入，关系输出保持输入顺序
 * @param elements 全部元素的最终根局部边界，与布局返回的元素一致
 * @param context 布局执行上下文，解析 smooth 经过点时必需
 * @returns 按输入关系顺序排列的路由输出，由调用方与元素一起返回并接受布局输出校验
 */
export const routeFlowRelations = (
  input: FlowLayoutInput,
  elements: ReadonlyArray<FlowLayoutElementOutput>,
  context?: FlowLayoutExecutionContext,
): ReadonlyArray<FlowLayoutRelationOutput> => {
  const bounds = new Map(elements.map(element => [element.id, element.bounds]));
  const index = buildRoutingIndex(input.elements);
  const routed: Array<FlowLayoutRelationOutput> = input.relations.map((relation, relationIndex) => {
    const sourceBounds = bounds.get(relation.source);
    const targetBounds = bounds.get(relation.target);
    if (sourceBounds === undefined || targetBounds === undefined) {
      return { route: { kind: 'straight', points: [] } };
    }
    const source = centerOf(sourceBounds);
    const target = centerOf(targetBounds);
    if (relation.routing.kind === 'smooth') {
      if (context === undefined) return flowBendGeometryFailure(relationIndex, relation, undefined);
      const route: FlowLayoutRoute = {
        kind: 'smooth',
        tension: relation.routing.tension,
        points: context.resolveRoutePoints({
          elements,
          source: relation.source,
          target: relation.target,
          points: relation.routing.points,
        }),
      };
      const labelBounds = flowRouteLabelBounds(route, relation);
      return { route, ...(labelBounds === undefined ? {} : { labelBounds }) };
    }
    if (relation.routing.kind === 'curve' || relation.routing.kind === 'cubic') {
      const route = createFlowBezierBaseline(relation.routing, [source, target], relation, relationIndex);
      const labelBounds = flowRouteLabelBounds(route, relation);
      return { route, ...(labelBounds === undefined ? {} : { labelBounds }) };
    }
    if (relation.routing.kind === 'bend') {
      const route: FlowLayoutRoute =
        'outAngle' in relation.routing
          ? { ...relation.routing, points: [source, target] }
          : {
              ...relation.routing,
              bendAngle: relation.routing.bendAngle ?? FLOW_BEND_ANGLES[0],
              bendDirection: relation.routing.bendDirection ?? 'left',
              points: [source, target],
            };
      try {
        createFlowBendCurve(route);
        const labelBounds = flowRouteLabelBounds(route, relation);
        return { route, ...(labelBounds === undefined ? {} : { labelBounds }) };
      } catch (cause) {
        return flowBendGeometryFailure(relationIndex, relation, cause);
      }
    }
    const points =
      relation.routing.kind === 'straight'
        ? [source, target]
        : relation.routing.kind === FlowRoutingKind.HorizontalThenVertical
          ? collapsePoints([source, [target[0], source[1]], target])
          : relation.routing.kind === FlowRoutingKind.VerticalThenHorizontal
            ? collapsePoints([source, [source[0], target[1]], target])
            : createFlowOrthogonalCandidates(input, elements, relationIndex)[0].points;
    const route: FlowLayoutRoute = { ...relation.routing, points };
    const labelBounds =
      relation.labelPlacement === undefined
        ? relation.labelSize === undefined
          ? undefined
          : labelBoundsFor(points, relation.labelSize)
        : flowRouteLabelBounds(route, relation);
    return { route, ...(labelBounds === undefined ? {} : { labelBounds }) };
  });
  const isAutomatic = (relation: FlowLayoutRelationInput): boolean => isFlowAutomaticRouting(relation.routing);
  for (const [relationIndex, relation] of input.relations.entries()) {
    const routing = relation.routing;
    if (routing.kind === 'orthogonal') {
      const candidates = createFlowOrthogonalCandidates(input, elements, relationIndex);
      const first = candidates[0];
      if (first.points.length === 2) continue;
      const obstacles = flowRelationObstacles(input, { elements }, relation);
      const labels = flowPriorLabelReservations(input.relations, routed, relationIndex);
      let best = { route: first, ...evaluateFlowOrthogonalConflicts(first, relation, obstacles, labels) };
      for (const route of candidates.slice(1)) {
        const candidate = { route, ...evaluateFlowOrthogonalConflicts(route, relation, obstacles, labels) };
        const difference = candidate.score.findIndex(
          (value, scoreIndex) => Math.abs(value - best.score[scoreIndex]) > DEFAULT_EPSILON,
        );
        if (difference >= 0 && candidate.score[difference] < best.score[difference]) best = candidate;
      }
      const labelBounds =
        relation.labelPlacement === undefined && relation.labelSize !== undefined
          ? labelBoundsFor(best.route.points, relation.labelSize)
          : best.labelBounds;
      routed[relationIndex] = { route: best.route, ...(labelBounds === undefined ? {} : { labelBounds }) };
      continue;
    }
    const initialBezier = routed[relationIndex].route;
    if (isAutomatic(relation) && (initialBezier.kind === 'curve' || initialBezier.kind === 'cubic')) {
      const scope = commonScope(index.scopes.get(relation.source) ?? [], index.scopes.get(relation.target) ?? []);
      const scopeLayout = scope === undefined ? input.layout : (index.layouts.get(scope) ?? input.layout);
      routed[relationIndex] = selectFlowBezierRoute(
        initialBezier,
        relation,
        scopeLayout,
        flowRelationObstacles(input, { elements }, relation),
        flowPriorLabelReservations(input.relations, routed, relationIndex),
      );
      continue;
    }
    if (!isAutomatic(relation) || routing.kind !== 'bend' || 'outAngle' in routing) continue;
    const initial = routed[relationIndex].route;
    if (initial.kind !== 'bend' || !('bendAngle' in initial)) continue;
    const obstacles = flowRelationObstacles(input, { elements }, relation);
    const otherOutputs = routed.filter(
      (other, otherIndex) =>
        other.labelBounds !== undefined &&
        otherIndex !== relationIndex &&
        (otherIndex < relationIndex || !isAutomatic(input.relations[otherIndex])),
    );
    const angles = routing.bendAngle === undefined ? FLOW_BEND_ANGLES : [routing.bendAngle];
    const directions: ReadonlyArray<'left' | 'right'> =
      routing.bendDirection === undefined ? ['left', 'right'] : [routing.bendDirection];
    try {
      let bestNodes: readonly [number, number] | undefined;
      let finalists: Array<FlowBendRoute> = [];
      for (const bendAngle of angles)
        for (const bendDirection of directions) {
          const route = { ...initial, bendAngle, bendDirection };
          const nodes = scoreFlowBendNodes(route, relation, obstacles);
          const difference =
            bestNodes === undefined
              ? -1
              : nodes.findIndex((value, scoreIndex) => Math.abs(value - bestNodes![scoreIndex]) > DEFAULT_EPSILON);
          if (bestNodes === undefined || (difference >= 0 && nodes[difference] < bestNodes[difference])) {
            bestNodes = nodes;
            finalists = [route];
          } else if (difference < 0) finalists.push(route);
        }
      let bestLabels = Infinity;
      for (const route of finalists) {
        const labelBounds = flowRouteLabelBounds(route, relation);
        let conflicts = 0;
        // 节点评分已决胜时无需计算标签冲突；其预留盒仍作为输出交付
        if (finalists.length > 1) {
          const segment = createFlowBendCurve(route);
          for (const other of otherOutputs) {
            if (findFlowCurveObstacleIntervals(segment, other.labelBounds!).length > 0) conflicts += 1;
            if (labelBounds !== undefined && doFlowBoundsOverlap(labelBounds, other.labelBounds!)) conflicts += 1;
          }
          if (labelBounds !== undefined)
            for (const obstacle of obstacles) if (doFlowBoundsOverlap(labelBounds, obstacle.bounds)) conflicts += 1;
        }
        if (conflicts < bestLabels) {
          bestLabels = conflicts;
          routed[relationIndex] = { route, ...(labelBounds === undefined ? {} : { labelBounds }) };
        }
        // 候选已按小角度、左侧优先排序，零标签冲突不可能再改善
        if (conflicts === 0) break;
      }
    } catch (cause) {
      flowBendGeometryFailure(relationIndex, relation, cause);
    }
  }
  return routed;
};
