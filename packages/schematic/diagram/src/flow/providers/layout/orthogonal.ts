import type { BoundsRect, Position } from '@retikz/math';
import { DEFAULT_EPSILON } from '@retikz/math';

import type { FlowLayoutExecutionContext } from '../../contract';
import type {
  EffectiveFlowLayout,
  FlowLayoutInput,
  FlowLayoutOutput,
  FlowLayoutRoute,
  FlowLayoutRelationInput,
} from '../../contract';
import { doFlowBoundsOverlap } from '../../shared/geometry';
import type { FlowRelationEndpoints } from './endpoints';
import { resolveFlowEndpointPosition } from './endpoints';
import type { flowRelationObstacles } from './geometry';
import { flowRouteLabelBounds } from './geometry';

/** 正交有限候选的源意图与参考点链 */
type OrthogonalRoute = Extract<FlowLayoutRoute, { kind: 'orthogonal' }>;

/** 在实际作用域和边界间隙中生成正交候选，对齐端点不产生绕行 */
export const createFlowOrthogonalCandidates = (
  input: FlowLayoutInput,
  elements: FlowLayoutOutput['elements'],
  relationIndex: number,
  endpoints?: FlowRelationEndpoints,
  context?: FlowLayoutExecutionContext,
): Array<OrthogonalRoute> => {
  const relation = input.relations[relationIndex];
  if (relation.routing.kind !== 'orthogonal') return [];
  const routing = relation.routing;
  const bounds = new Map(elements.map(element => [element.id, element.bounds]));
  const sourceBounds = bounds.get(relation.source.id)!,
    targetBounds = bounds.get(relation.target.id)!;
  const source: Position = [
    ...resolveFlowEndpointPosition(endpoints?.source ?? { id: relation.source.id }, elements, context),
  ];
  const target: Position = [
    ...resolveFlowEndpointPosition(endpoints?.target ?? { id: relation.target.id }, elements, context),
  ];
  const route = (points: Array<Position>): OrthogonalRoute => ({
    ...routing,
    kind: 'orthogonal',
    cornerRadius: routing.cornerRadius,
    points: points.filter(
      (point, index) => index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1],
    ),
  });
  if (source[0] === target[0] || source[1] === target[1]) return [route([source, target])];
  const paths = new Map<string, Array<EffectiveFlowLayout>>();
  const visit = (items: FlowLayoutInput['elements'], ancestors: Array<EffectiveFlowLayout>): void => {
    for (const item of items) {
      paths.set(item.id, ancestors);
      if (item.kind !== 'leaf') visit(item.elements, [...ancestors, item.layout]);
    }
  };
  visit(input.elements, []);
  let layout = input.layout;
  const sourcePath = paths.get(relation.source.id) ?? [],
    targetPath = paths.get(relation.target.id) ?? [];
  for (
    let index = 0;
    index < Math.min(sourcePath.length, targetPath.length) && sourcePath[index] === targetPath[index];
    index++
  )
    layout = sourcePath[index];
  const horizontal = layout.direction === 'right' || layout.direction === 'left';
  const axis = horizontal ? 0 : 1;
  const sign = layout.direction === 'right' || layout.direction === 'down' ? 1 : -1;
  const order = relation.direction === 'reverse' ? -1 : 1;
  const feedback =
    relation.direction !== 'none' && relation.direction !== 'both' && (target[axis] - source[axis]) * sign * order <= 0;
  const pair = input.relations
    .map((other, index) => ({ other, index }))
    .filter(
      ({ other }) =>
        (other.source.id === relation.source.id && other.target.id === relation.target.id) ||
        (other.source.id === relation.target.id && other.target.id === relation.source.id),
    );
  const laneOffset = (pair.findIndex(entry => entry.index === relationIndex) - (pair.length - 1) / 2) * 12;
  const position = (middle: number): OrthogonalRoute =>
    route(
      horizontal
        ? [source, [middle, source[1]], [middle, target[1]], target]
        : [source, [source[0], middle], [target[0], middle], target],
    );
  if (feedback) {
    const extrema = elements.map(element =>
      horizontal
        ? sign > 0
          ? element.bounds.x + element.bounds.width
          : element.bounds.x
        : sign > 0
          ? element.bounds.y + element.bounds.height
          : element.bounds.y,
    );
    return [
      position(
        (sign > 0 ? Math.max(0, ...extrema) : Math.min(0, ...extrema)) +
          sign * (layout.rankGap / 2 + Math.abs(laneOffset)),
      ),
    ];
  }
  const authoredSign = target[axis] > source[axis] ? 1 : -1;
  const sourceSize = horizontal ? sourceBounds.width : sourceBounds.height,
    targetSize = horizontal ? targetBounds.width : targetBounds.height;
  let start = source[axis] + (authoredSign * sourceSize) / 2,
    end = target[axis] - (authoredSign * targetSize) / 2;
  const separated = (end - start) * authoredSign >= 0;
  if (!separated) {
    start = source[axis];
    end = target[axis];
  }
  return (relation.routing.turnPosition === undefined ? [0.5, 0.25, 0.75] : [relation.routing.turnPosition]).map(
    fraction => {
      const middle = start + (end - start) * fraction + laneOffset;
      return position(separated ? Math.min(Math.max(start, end), Math.max(Math.min(start, end), middle)) : middle);
    },
  );
};

/** 轴对齐点链的连续碰撞区间按路径长度合并，只豁免首尾连接区间 */
const obstacleIntervals = (
  points: OrthogonalRoute['points'],
  box: Readonly<BoundsRect>,
  exemptStart = false,
  exemptEnd = false,
): Array<readonly [number, number]> => {
  const intervals: Array<[number, number]> = [];
  let travelled = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1],
      to = points[index],
      horizontal = from[1] === to[1],
      axis = horizontal ? 0 : 1;
    const length = Math.abs(to[axis] - from[axis]);
    if (length === 0) continue;
    const fixed = horizontal ? from[1] : from[0],
      fixedMin = horizontal ? box.y : box.x,
      fixedMax = fixedMin + (horizontal ? box.height : box.width);
    const lower = horizontal ? box.x : box.y,
      upper = lower + (horizontal ? box.width : box.height);
    const low = Math.max(Math.min(from[axis], to[axis]), lower),
      high = Math.min(Math.max(from[axis], to[axis]), upper);
    if (fixed >= fixedMin - DEFAULT_EPSILON && fixed <= fixedMax + DEFAULT_EPSILON && low <= high + DEFAULT_EPSILON) {
      const first = to[axis] > from[axis] ? low : high,
        last = to[axis] > from[axis] ? high : low;
      const start = travelled + Math.abs(first - from[axis]),
        end = travelled + Math.abs(last - from[axis]);
      const previous = intervals.at(-1);
      if (previous && Math.abs(previous[1] - start) <= DEFAULT_EPSILON) previous[1] = end;
      else intervals.push([start, end]);
    }
    travelled += length;
  }
  return intervals.filter(
    ([start, end]) =>
      !(exemptStart && start <= DEFAULT_EPSILON) && !(exemptEnd && Math.abs(end - travelled) <= DEFAULT_EPSILON),
  );
};

/** 正交路线按节点数、实际穿越长度、标签冲突逐项比较 */
export const evaluateFlowOrthogonalConflicts = (
  route: OrthogonalRoute,
  relation: FlowLayoutRelationInput,
  obstacles: ReturnType<typeof flowRelationObstacles>,
  labels: ReadonlyArray<Readonly<{ bounds: Readonly<BoundsRect> }>>,
) => {
  let nodes = 0,
    penetration = 0,
    labelConflicts = 0;
  const labelBounds = flowRouteLabelBounds(route, relation);
  for (const obstacle of obstacles) {
    const intervals = obstacleIntervals(
      route.points,
      obstacle.bounds,
      obstacle.id === relation.source.id,
      obstacle.id === relation.target.id,
    );
    if (intervals.length > 0) nodes++;
    penetration += intervals.reduce((total, [start, end]) => total + end - start, 0);
    if (labelBounds && doFlowBoundsOverlap(labelBounds, obstacle.bounds)) labelConflicts++;
  }
  for (const label of labels) {
    if (obstacleIntervals(route.points, label.bounds).length > 0) labelConflicts++;
    if (labelBounds && doFlowBoundsOverlap(labelBounds, label.bounds)) labelConflicts++;
  }
  return { score: [nodes, penetration, labelConflicts] as const, labelBounds };
};
