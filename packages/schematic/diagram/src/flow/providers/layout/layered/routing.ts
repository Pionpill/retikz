import type { BoundsRect, Position } from '@retikz/math';

import type {
  EffectiveFlowLayout,
  FlowLayoutElementInput,
  FlowLayoutElementOutput,
  FlowLayoutInput,
  FlowLayoutRelationInput,
  FlowLayoutRelationOutput,
} from '../../../contract';

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
  let selectedIndex = 0;
  let selectedLength = -1;
  points.slice(1).forEach((point, index) => {
    const previous = points[index];
    const length = Math.abs(point[0] - previous[0]) + Math.abs(point[1] - previous[1]);
    if (length > selectedLength) {
      selectedLength = length;
      selectedIndex = index;
    }
  });
  const source = points[selectedIndex];
  const target = points[selectedIndex + 1];
  const horizontal = source[1] === target[1];
  const centerX = (source[0] + target[0]) / 2;
  const centerY = (source[1] + target[1]) / 2;
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

  return input.relations.map((relation, relationIndex) => {
    const sourceBounds = bounds.get(relation.source);
    const targetBounds = bounds.get(relation.target);
    if (sourceBounds === undefined || targetBounds === undefined) {
      return { points: [] };
    }
    const source = centerOf(sourceBounds);
    const target = centerOf(targetBounds);
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
    return {
      points,
      ...(relation.labelSize === undefined ? {} : { labelBounds: labelBoundsFor(points, relation.labelSize) }),
    };
  });
};
