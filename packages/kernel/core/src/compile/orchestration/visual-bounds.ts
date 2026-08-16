import type { BoundsRect } from '@retikz/math';

import { boundsOf, boundsToRect } from '@retikz/math';

import type { GroupPrim, PathCommand, PathPrim, ScenePrimitive, SceneResource, Transform } from '../../contract';
import type { IRPosition, ResolvedDropShadow } from '../../schemas';

import { DEG_TO_RAD } from '../../shared/geometry';
import { CANONICAL_STROKE_MITER_LIMIT } from '../constants';
import { buildMarkMarkerGroup } from '../path';
import { CompileInvariantError } from '../probe-failure';
import { applyTransformChain } from '../transform';
import { canonicalizeBoundsRect, expandBoundsForShadow } from './bounds';

type MutableRect = { x: number; y: number; width: number; height: number };

const union = (left: BoundsRect | undefined, right: BoundsRect | undefined): BoundsRect | undefined => {
  if (left === undefined) return right;
  if (right === undefined) return left;
  const minX = Math.min(left.x, right.x);
  const minY = Math.min(left.y, right.y);
  const maxX = Math.max(left.x + left.width, right.x + right.width);
  const maxY = Math.max(left.y + left.height, right.y + right.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const intersect = (left: BoundsRect, right: BoundsRect): BoundsRect | undefined => {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const maxX = Math.min(left.x + left.width, right.x + right.width);
  const maxY = Math.min(left.y + left.height, right.y + right.height);
  return maxX < x || maxY < y ? undefined : { x, y, width: maxX - x, height: maxY - y };
};

const rectOfPoints = (points: ReadonlyArray<IRPosition>): BoundsRect | undefined => {
  const bounds = boundsOf(points);
  return bounds === undefined ? undefined : boundsToRect(bounds);
};

const projectRect = (rect: BoundsRect, transforms: ReadonlyArray<Transform>): BoundsRect | undefined =>
  rectOfPoints([
    applyTransformChain([rect.x, rect.y], transforms),
    applyTransformChain([rect.x + rect.width, rect.y], transforms),
    applyTransformChain([rect.x + rect.width, rect.y + rect.height], transforms),
    applyTransformChain([rect.x, rect.y + rect.height], transforms),
  ]);

const ellipseRect = (cx: number, cy: number, rx: number, ry: number, rotationDegrees = 0): BoundsRect => {
  const theta = rotationDegrees * DEG_TO_RAD;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const halfWidth = Math.sqrt((rx * cos) ** 2 + (ry * sin) ** 2);
  const halfHeight = Math.sqrt((rx * sin) ** 2 + (ry * cos) ** 2);
  return {
    x: cx - halfWidth,
    y: cy - halfHeight,
    width: halfWidth * 2,
    height: halfHeight * 2,
  };
};

const commandPoints = (command: PathCommand): Array<IRPosition> => {
  switch (command.kind) {
    case 'move':
    case 'line':
      return [command.to];
    case 'quad':
      return [command.control, command.to];
    case 'cubic':
      return [command.control1, command.control2, command.to];
    case 'arc':
      return [
        [command.center[0] - command.radius, command.center[1] - command.radius],
        [command.center[0] + command.radius, command.center[1] + command.radius],
      ];
    case 'ellipseArc': {
      const rect = ellipseRect(
        command.center[0],
        command.center[1],
        command.radiusX,
        command.radiusY,
        command.rotation,
      );
      return [
        [rect.x, rect.y],
        [rect.x + rect.width, rect.y + rect.height],
      ];
    }
    case 'close':
      return [];
  }
};

const pathGeometry = (commands: ReadonlyArray<PathCommand>): BoundsRect | undefined =>
  rectOfPoints(commands.flatMap(commandPoints));

const expandStroke = (rect: BoundsRect, strokeWidth: number | undefined, miter: boolean): BoundsRect => {
  const half = (strokeWidth ?? 1) / 2;
  const amount = miter ? half * CANONICAL_STROKE_MITER_LIMIT : half;
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
};

const expandShadow = (rect: BoundsRect, shadow: ResolvedDropShadow | undefined): BoundsRect => {
  if (shadow === undefined) return rect;
  const expanded = expandBoundsForShadow(
    {
      minX: rect.x,
      minY: rect.y,
      maxX: rect.x + rect.width,
      maxY: rect.y + rect.height,
    },
    shadow,
  );
  return expanded === undefined ? rect : boundsToRect(expanded);
};

type EndpointSample = { point: IRPosition; tangent: IRPosition };

const endpointSamples = (
  commands: ReadonlyArray<PathCommand>,
): {
  start?: EndpointSample;
  end?: EndpointSample;
} => {
  let cursor: IRPosition = [0, 0];
  let subpathStart: IRPosition = cursor;
  let start: EndpointSample | undefined;
  let end: EndpointSample | undefined;
  for (const command of commands) {
    if (command.kind === 'move') {
      cursor = command.to;
      subpathStart = command.to;
      continue;
    }
    let next = cursor;
    let startTangent: IRPosition = [1, 0];
    let endTangent: IRPosition = [1, 0];
    switch (command.kind) {
      case 'line':
        next = command.to;
        startTangent = [next[0] - cursor[0], next[1] - cursor[1]];
        endTangent = startTangent;
        break;
      case 'quad':
        next = command.to;
        startTangent = [command.control[0] - cursor[0], command.control[1] - cursor[1]];
        endTangent = [next[0] - command.control[0], next[1] - command.control[1]];
        break;
      case 'cubic':
        next = command.to;
        startTangent = [command.control1[0] - cursor[0], command.control1[1] - cursor[1]];
        endTangent = [next[0] - command.control2[0], next[1] - command.control2[1]];
        break;
      case 'arc': {
        const startAngle = command.startAngle * DEG_TO_RAD;
        const endAngle = command.endAngle * DEG_TO_RAD;
        const direction = command.counterClockwise === true ? -1 : 1;
        next = [
          command.center[0] + command.radius * Math.cos(endAngle),
          command.center[1] + command.radius * Math.sin(endAngle),
        ];
        startTangent = [-Math.sin(startAngle) * direction, Math.cos(startAngle) * direction];
        endTangent = [-Math.sin(endAngle) * direction, Math.cos(endAngle) * direction];
        break;
      }
      case 'ellipseArc': {
        const theta = (command.rotation ?? 0) * DEG_TO_RAD;
        const pointAndTangent = (degrees: number): EndpointSample => {
          const angle = degrees * DEG_TO_RAD;
          const x = command.radiusX * Math.cos(angle);
          const y = command.radiusY * Math.sin(angle);
          const tx = -command.radiusX * Math.sin(angle);
          const ty = command.radiusY * Math.cos(angle);
          return {
            point: [
              command.center[0] + x * Math.cos(theta) - y * Math.sin(theta),
              command.center[1] + x * Math.sin(theta) + y * Math.cos(theta),
            ],
            tangent: [tx * Math.cos(theta) - ty * Math.sin(theta), tx * Math.sin(theta) + ty * Math.cos(theta)],
          };
        };
        const first = pointAndTangent(command.startAngle);
        const last = pointAndTangent(command.endAngle);
        const direction = command.counterClockwise === true ? -1 : 1;
        next = last.point;
        startTangent = [first.tangent[0] * direction, first.tangent[1] * direction];
        endTangent = [last.tangent[0] * direction, last.tangent[1] * direction];
        break;
      }
      case 'close':
        next = subpathStart;
        startTangent = [next[0] - cursor[0], next[1] - cursor[1]];
        endTangent = startTangent;
        break;
    }
    start ??= { point: cursor, tangent: [-startTangent[0], -startTangent[1]] };
    end = { point: next, tangent: endTangent };
    cursor = next;
  }
  return { start, end };
};

const markerBounds = (path: PathPrim, resources: ReadonlyMap<string, SceneResource>): BoundsRect | undefined => {
  const samples = endpointSamples(path.commands);
  const strokeWidth = path.strokeWidth ?? 1;
  const contextStroke = typeof path.stroke === 'string' ? path.stroke : 'currentColor';
  let bounds: BoundsRect | undefined;
  if (path.arrowStart !== undefined && path.arrowStart.opacity !== 0 && samples.start !== undefined) {
    bounds = union(
      bounds,
      primitiveBounds(
        buildMarkMarkerGroup(path.arrowStart, samples.start, {
          strokeWidth,
          round: value => value,
          contextStroke,
        }),
        resources,
      ),
    );
  }
  if (path.arrowEnd !== undefined && path.arrowEnd.opacity !== 0 && samples.end !== undefined) {
    bounds = union(
      bounds,
      primitiveBounds(
        buildMarkMarkerGroup(path.arrowEnd, samples.end, {
          strokeWidth,
          round: value => value,
          contextStroke,
        }),
        resources,
      ),
    );
  }
  return bounds;
};

const styledGeometryBounds = (
  primitive: Exclude<ScenePrimitive, GroupPrim | { type: 'text' }>,
): BoundsRect | undefined => {
  if (primitive.opacity === 0) return undefined;
  const fillVisible = primitive.fill !== undefined && primitive.fillOpacity !== 0;
  const strokeVisible = primitive.stroke !== undefined && primitive.strokeOpacity !== 0;
  if (!fillVisible && !strokeVisible) return undefined;
  const geometry =
    primitive.type === 'rect'
      ? { x: primitive.x, y: primitive.y, width: primitive.width, height: primitive.height }
      : primitive.type === 'ellipse'
        ? ellipseRect(primitive.cx, primitive.cy, primitive.rx, primitive.ry, primitive.rotate)
        : pathGeometry(primitive.commands);
  if (geometry === undefined) return undefined;
  const painted = strokeVisible
    ? expandStroke(
        geometry,
        primitive.strokeWidth,
        primitive.type === 'path' && (primitive.strokeLinejoin ?? 'miter') === 'miter',
      )
    : geometry;
  return expandShadow(painted, primitive.shadow);
};

const primitiveBounds = (
  primitive: ScenePrimitive,
  resources: ReadonlyMap<string, SceneResource>,
): BoundsRect | undefined => {
  if (primitive.type === 'text') {
    if (primitive.opacity === 0) return undefined;
    const x =
      primitive.align === 'start'
        ? primitive.x
        : primitive.align === 'middle'
          ? primitive.x - primitive.measuredWidth / 2
          : primitive.x - primitive.measuredWidth;
    const y =
      primitive.baseline === 'top'
        ? primitive.y
        : primitive.baseline === 'middle'
          ? primitive.y - primitive.measuredHeight / 2
          : primitive.y - primitive.measuredHeight;
    return { x, y, width: primitive.measuredWidth, height: primitive.measuredHeight };
  }
  if (primitive.type === 'group') {
    let bounds = primitive.children.reduce<BoundsRect | undefined>(
      (current, child) => union(current, primitiveBounds(child, resources)),
      undefined,
    );
    if (bounds === undefined) return undefined;
    if (primitive.clipRef !== undefined) {
      const resource = resources.get(primitive.clipRef);
      if (resource === undefined || resource.kind !== 'clip') {
        throw new CompileInvariantError(
          `Cannot resolve clip resource '${primitive.clipRef}' for canonical visual bounds`,
        );
      }
      const clip = pathGeometry(resource.path.commands);
      if (clip !== undefined) bounds = intersect(bounds, clip);
      if (bounds === undefined) return undefined;
    }
    return primitive.transforms === undefined || primitive.transforms.length === 0
      ? bounds
      : projectRect(bounds, primitive.transforms);
  }
  if (primitive.type === 'path' && primitive.opacity === 0) return undefined;
  const geometry = styledGeometryBounds(primitive);
  return primitive.type === 'path' ? union(geometry, markerBounds(primitive, resources)) : geometry;
};

/** 从最终 settled Scene primitive tree 计算可选 canonical visual bounds */
export const optionalVisualBoundsOfPrimitives = (
  primitives: ReadonlyArray<ScenePrimitive>,
  resources: ReadonlyArray<SceneResource>,
): Readonly<BoundsRect> | undefined => {
  const resourceMap = new Map(resources.map(resource => [resource.id, resource]));
  const bounds = primitives.reduce<BoundsRect | undefined>(
    (current, primitive) => union(current, primitiveBounds(primitive, resourceMap)),
    undefined,
  );
  if (bounds === undefined) return undefined;
  const output: MutableRect = bounds;
  const right = output.x + output.width;
  const bottom = output.y + output.height;
  if (
    ![output.x, output.y, output.width, output.height, right, bottom].every(Number.isFinite) ||
    output.width < 0 ||
    output.height < 0
  ) {
    throw new CompileInvariantError('Canonical visual bounds and their derived edges must remain finite and valid');
  }
  return canonicalizeBoundsRect(output);
};

/** 从最终 settled Scene primitive tree 计算 canonical visual bounds */
export const visualBoundsOfPrimitives = (
  primitives: ReadonlyArray<ScenePrimitive>,
  resources: ReadonlyArray<SceneResource>,
): Readonly<BoundsRect> =>
  optionalVisualBoundsOfPrimitives(primitives, resources) ?? Object.freeze({ x: 0, y: 0, width: 0, height: 0 });
