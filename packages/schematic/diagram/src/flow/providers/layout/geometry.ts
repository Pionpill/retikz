import type { PathCommand } from '@retikz/core';
import { bendControlPoints, outInControlPoints, resolveGeometryLabelPlacement, samplePathRoute } from '@retikz/core';
import type { BoundsRect, CurveSegment, Position } from '@retikz/math';
import { applyAffine, boundsOf, boundsToRect, cornersOfBounds, rectToBounds, curve } from '@retikz/math';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type {
  FlowBendRoute,
  FlowSmoothRoute,
  FlowBezierRoute,
  FlowLayoutElementInput,
  FlowLayoutInput,
  FlowLayoutOutput,
  FlowLayoutRelationInput,
  FlowLayoutRoute,
} from '../../contract';
import { doFlowBoundsOverlap, findFlowCurveObstacleIntervals, getFlowCurveBounds } from '../../shared/geometry';

/** 用 Core 唯一 bend 几何生成瞬时参考曲线 */
export const createFlowBendCurve = (route: FlowBendRoute): CurveSegment => {
  const from: Position = [...route.points[0]],
    to: Position = [...route.points[1]];
  const [control1, control2] =
    'outAngle' in route
      ? outInControlPoints(from, to, route.outAngle, route.inAngle, route.looseness)
      : bendControlPoints(from, to, route.bendDirection, route.bendAngle);
  return { kind: 'cubicBezier', from, to, control1, control2 };
};

/** 数值贝塞尔路由转换为 Math 曲线，不复制曲线求值逻辑 */
export const createFlowBezierCurve = (route: FlowBezierRoute): CurveSegment =>
  route.kind === 'curve'
    ? { kind: 'quadraticBezier', from: [...route.points[0]], to: [...route.points[1]], control: [...route.control] }
    : {
        kind: 'cubicBezier',
        from: [...route.points[0]],
        to: [...route.points[1]],
        control1: [...route.control1],
        control2: [...route.control2],
      };

/** 检查全部样条段，跨段合并连续接触后只豁免首尾连接区间 */
export const flowSmoothConflicts = (
  route: FlowSmoothRoute,
  relation: FlowLayoutRelationInput,
  obstacles: ReturnType<typeof flowRelationObstacles>,
): Array<string> => {
  const segments = curve.catmullRomToCubic(
    route.points.map(point => [...point]),
    route.tension,
  );
  return obstacles
    .filter(obstacle => {
      const intervals: Array<[number, number]> = [];
      for (const [index, segment] of segments.entries()) {
        for (const [start, end] of findFlowCurveObstacleIntervals(
          { kind: 'cubicBezier', from: index === 0 ? [...route.points[0]] : segments[index - 1].to, ...segment },
          obstacle.bounds,
        )) {
          const previous = intervals.at(-1);
          if (previous?.[1] === index + start) previous[1] = index + end;
          else intervals.push([index + start, index + end]);
        }
      }
      return intervals.some(
        ([start, end]) =>
          !(obstacle.id === relation.source && start === 0) &&
          !(obstacle.id === relation.target && end === segments.length),
      );
    })
    .map(obstacle => obstacle.id);
};

/** 路由转为 Core 采样输入，保留 Core 圆角语义 */
const routeCommands = (route: FlowLayoutRoute): Array<PathCommand> => {
  const commands: Array<PathCommand> = [{ kind: 'move', to: [...route.points[0]] }];
  if (route.kind === 'smooth') {
    for (const segment of curve.catmullRomToCubic(
      route.points.map(point => [...point]),
      route.tension,
    ))
      commands.push({ kind: 'cubic', control1: segment.control1, control2: segment.control2, to: segment.to });
  } else if (route.kind === 'bend') {
    const segment = createFlowBendCurve(route);
    if (segment.kind === 'cubicBezier')
      commands.push({ kind: 'cubic', control1: segment.control1, control2: segment.control2, to: segment.to });
  } else if (route.kind === 'curve')
    commands.push({ kind: 'quad', control: [...route.control], to: [...route.points[1]] });
  else if (route.kind === 'cubic')
    commands.push({
      kind: 'cubic',
      control1: [...route.control1],
      control2: [...route.control2],
      to: [...route.points[1]],
    });
  else for (const point of route.points.slice(1)) commands.push({ kind: 'line', to: [...point] });
  return commands;
};

/** 完整标签的预留矩形；使用参考路线，不能当作最终 glyph bounds */
export const flowRouteLabelBounds = (
  route: FlowLayoutRoute,
  relation: FlowLayoutRelationInput,
): BoundsRect | undefined => {
  if (relation.labelSize === undefined) return undefined;
  const placement = resolveGeometryLabelPlacement(relation.labelPlacement ?? {}, true);
  const sample = samplePathRoute(
    routeCommands(route),
    'cornerRadius' in route ? route.cornerRadius : 0,
    placement.position,
  );
  if (sample === undefined) return undefined;
  const { width, height } = relation.labelSize;
  const distance = placement.placement === 'inside' ? 0 : placement.distance;
  const [x, y] = sample.point;
  const rectangle = { x: x - width / 2, y: y - height / 2, width, height };
  if (placement.side === 'top') rectangle.y = y - distance - height;
  if (placement.side === 'bottom') rectangle.y = y + distance;
  if (placement.side === 'left') rectangle.x = x - distance - width;
  if (placement.side === 'right') rectangle.x = x + distance;
  if (!placement.sloped) return rectangle;
  const angle = Math.atan2(sample.tangent[1], sample.tangent[0]);
  const cosine = Math.cos(angle),
    sine = Math.sin(angle);
  const corners = cornersOfBounds(rectToBounds(rectangle)).map(point =>
    applyAffine([cosine, sine, -sine, cosine, x - cosine * x + sine * y, y - sine * x - cosine * y], point),
  );
  return boundsToRect(boundsOf(corners)!);
};

/** 每条关系独立的障碍盒，相关祖先外壳不作为实心障碍 */
export const flowRelationObstacles = (
  input: FlowLayoutInput,
  output: Pick<FlowLayoutOutput, 'elements'>,
  relation: FlowLayoutRelationInput,
): Array<Readonly<{ id: string; bounds: BoundsRect }>> => {
  const bounds = new Map(output.elements.map(element => [element.id, element.bounds]));
  const ancestors = new Set<string>();
  const visitAncestors = (elements: ReadonlyArray<FlowLayoutElementInput>, path: ReadonlyArray<string>): void => {
    for (const element of elements) {
      if (element.id === relation.source || element.id === relation.target) for (const id of path) ancestors.add(id);
      if (element.kind !== 'leaf') visitAncestors(element.elements, [...path, element.id]);
    }
  };
  visitAncestors(input.elements, []);
  const collect = (
    elements: ReadonlyArray<FlowLayoutElementInput>,
  ): Array<Readonly<{ id: string; bounds: BoundsRect }>> =>
    elements.flatMap(element => {
      const box = bounds.get(element.id)!;
      const obstacle =
        element.kind === 'leaf'
          ? {
              x: box.x - element.margin.left,
              y: box.y - element.margin.top,
              width: box.width + element.margin.left + element.margin.right,
              height: box.height + element.margin.top + element.margin.bottom,
            }
          : { ...box };
      return [
        ...(element.kind === 'layout' || ancestors.has(element.id) ? [] : [{ id: element.id, bounds: obstacle }]),
        ...(element.kind === 'leaf' ? [] : collect(element.elements)),
      ];
    });
  return collect(input.elements);
};

/** 节点优先评分：冲突节点数和连续参数跨度 */
export const scoreFlowBendNodes = (
  route: FlowBendRoute,
  relation: FlowLayoutRelationInput,
  obstacles: ReturnType<typeof flowRelationObstacles>,
): readonly [number, number] => {
  const segment = createFlowBendCurve(route);
  const bounds = getFlowCurveBounds(segment);
  let count = 0,
    span = 0;
  for (const obstacle of obstacles) {
    // 每条候选只计算一次包围盒；相交仅代表需要继续检测，不直接计为冲突
    if (!doFlowBoundsOverlap(bounds, obstacle.bounds)) continue;
    const intervals = findFlowCurveObstacleIntervals(
      segment,
      obstacle.bounds,
      obstacle.id === relation.source,
      obstacle.id === relation.target,
    );
    if (intervals.length > 0) count += 1;
    span += intervals.reduce((total, [start, end]) => total + end - start, 0);
  }
  return [count, span];
};

/** 将参考几何计算错误定位到对应 Source 关系，原样保留 Core cause */
export const flowBendGeometryFailure = (
  relationIndex: number,
  relation: FlowLayoutRelationInput,
  cause: unknown,
): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowMaterializationFailed,
    message: 'Flow bend reference geometry could not be materialized through Core.',
    details: {
      stage: 'materialize',
      path: ['relations', relationIndex],
      relatedIds: [relation.source, relation.target],
    },
    cause,
  });
};
