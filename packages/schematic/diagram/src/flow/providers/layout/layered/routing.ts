import type { BoundsRect, Position } from '@retikz/math';
import { DEFAULT_EPSILON } from '@retikz/math';

import type {
  EffectiveFlowLayout,
  FlowBendRoute,
  FlowLayoutElementInput,
  FlowLayoutElementOutput,
  FlowLayoutInput,
  FlowLayoutRelationInput,
  FlowLayoutRelationOutput,
  FlowLayoutRoute,
} from '../../../contract';
import { FlowRoutingKind } from '../../../shared';
import { FLOW_BEND_ANGLES, doFlowBoundsOverlap, findFlowCurveObstacleIntervals } from '../../../shared/geometry';
import {
  createFlowBendCurve,
  flowBendGeometryFailure,
  flowRelationObstacles,
  flowRouteLabelBounds,
  scoreFlowBendNodes,
} from '../geometry';

type RoutingIndex = Readonly<{
  scopes: ReadonlyMap<string, ReadonlyArray<string>>;
  layouts: ReadonlyMap<string, EffectiveFlowLayout>;
}>;

const centerOf = (bounds: Readonly<BoundsRect>): Position => [
  bounds.x + bounds.width / 2,
  bounds.y + bounds.height / 2,
];

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

const collapsePoints = (points: ReadonlyArray<Position>): ReadonlyArray<Position> =>
  points.filter(
    (point, index) => index === 0 || point[0] !== points[index - 1]?.[0] || point[1] !== points[index - 1]?.[1],
  );

const middleOfGap = (start: number, end: number, centerFallback: number, laneOffset: number): number => {
  if (start > end) return centerFallback + laneOffset;
  return Math.min(end, Math.max(start, (start + end) / 2 + laneOffset));
};

const isFeedback = (
  relation: FlowLayoutRelationInput,
  source: Position,
  target: Position,
  direction: EffectiveFlowLayout['direction'],
): boolean => {
  if (relation.direction === 'none' || relation.direction === 'both') return false;
  const [precedenceSource, precedenceTarget] = relation.direction === 'reverse' ? [target, source] : [source, target];
  if (direction === 'right') return precedenceSource[0] >= precedenceTarget[0];
  if (direction === 'left') return precedenceSource[0] <= precedenceTarget[0];
  if (direction === 'down') return precedenceSource[1] >= precedenceTarget[1];
  return precedenceSource[1] <= precedenceTarget[1];
};

const orthogonalPoints = (
  relation: FlowLayoutRelationInput,
  source: Position,
  target: Position,
  sourceBounds: Readonly<BoundsRect>,
  targetBounds: Readonly<BoundsRect>,
  direction: EffectiveFlowLayout['direction'],
  laneOffset: number,
  envelope: Readonly<BoundsRect>,
  rankGap: number,
): ReadonlyArray<Position> => {
  const feedback = isFeedback(relation, source, target, direction);
  if (direction === 'right' || direction === 'left') {
    const middle = feedback
      ? direction === 'right'
        ? envelope.x + envelope.width + rankGap / 2 + Math.abs(laneOffset)
        : envelope.x - rankGap / 2 - Math.abs(laneOffset)
      : direction === 'right'
        ? middleOfGap(sourceBounds.x + sourceBounds.width, targetBounds.x, (source[0] + target[0]) / 2, laneOffset)
        : middleOfGap(targetBounds.x + targetBounds.width, sourceBounds.x, (source[0] + target[0]) / 2, laneOffset);
    return collapsePoints([source, [middle, source[1]], [middle, target[1]], target]);
  }
  const middle = feedback
    ? direction === 'down'
      ? envelope.y + envelope.height + rankGap / 2 + Math.abs(laneOffset)
      : envelope.y - rankGap / 2 - Math.abs(laneOffset)
    : direction === 'down'
      ? middleOfGap(sourceBounds.y + sourceBounds.height, targetBounds.y, (source[1] + target[1]) / 2, laneOffset)
      : middleOfGap(targetBounds.y + targetBounds.height, sourceBounds.y, (source[1] + target[1]) / 2, laneOffset);
  return collapsePoints([source, [source[0], middle], [target[0], middle], target]);
};

const labelBoundsFor = (
  points: ReadonlyArray<Position>,
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

/** 在全部 element root-local bounds 上确定 relation point chain 与 label reservation */
export const routeLayeredRelations = (
  input: FlowLayoutInput,
  elements: ReadonlyArray<FlowLayoutElementOutput>,
): ReadonlyArray<FlowLayoutRelationOutput> => {
  const bounds = new Map(elements.map(element => [element.id, element.bounds]));
  const minX = Math.min(0, ...elements.map(element => element.bounds.x));
  const minY = Math.min(0, ...elements.map(element => element.bounds.y));
  const maxX = Math.max(0, ...elements.map(element => element.bounds.x + element.bounds.width));
  const maxY = Math.max(0, ...elements.map(element => element.bounds.y + element.bounds.height));
  const envelope = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  const index = buildRoutingIndex(input.elements);
  const pairs = new Map<string, Array<number>>();
  input.relations.forEach((relation, relationIndex) => {
    const key = [relation.source, relation.target].sort().join('\u0000');
    const indices = pairs.get(key) ?? [];
    indices.push(relationIndex);
    pairs.set(key, indices);
  });

  const routed: Array<FlowLayoutRelationOutput> = input.relations.map((relation, relationIndex) => {
    const sourceBounds = bounds.get(relation.source);
    const targetBounds = bounds.get(relation.target);
    if (sourceBounds === undefined || targetBounds === undefined) {
      return { route: { kind: 'straight', points: [] } };
    }
    const source = centerOf(sourceBounds);
    const target = centerOf(targetBounds);
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
    const sourceScopes = index.scopes.get(relation.source) ?? [];
    const targetScopes = index.scopes.get(relation.target) ?? [];
    const scope = commonScope(sourceScopes, targetScopes);
    const scopeLayout = scope === undefined ? input.layout : (index.layouts.get(scope) ?? input.layout);
    const pair = pairs.get([relation.source, relation.target].sort().join('\u0000')) ?? [relationIndex];
    const pairIndex = pair.indexOf(relationIndex);
    const laneOffset = (pairIndex - (pair.length - 1) / 2) * 12;
    const points =
      relation.routing.kind === 'straight'
        ? [source, target]
        : relation.routing.kind === FlowRoutingKind.HorizontalThenVertical
          ? collapsePoints([source, [target[0], source[1]], target])
          : relation.routing.kind === FlowRoutingKind.VerticalThenHorizontal
            ? collapsePoints([source, [source[0], target[1]], target])
            : orthogonalPoints(
                relation,
                source,
                target,
                sourceBounds,
                targetBounds,
                scopeLayout.direction,
                laneOffset,
                envelope,
                scopeLayout.rankGap,
              );
    const route: FlowLayoutRoute = { ...relation.routing, points };
    const labelBounds =
      relation.labelPlacement === undefined
        ? relation.labelSize === undefined
          ? undefined
          : labelBoundsFor(points, relation.labelSize)
        : flowRouteLabelBounds(route, relation);
    return { route, ...(labelBounds === undefined ? {} : { labelBounds }) };
  });
  const isAutomatic = (relation: FlowLayoutRelationInput): boolean =>
    relation.routing.kind === 'bend' &&
    !('outAngle' in relation.routing) &&
    (relation.routing.bendDirection === undefined || relation.routing.bendAngle === undefined);
  for (const [relationIndex, relation] of input.relations.entries()) {
    const routing = relation.routing;
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
