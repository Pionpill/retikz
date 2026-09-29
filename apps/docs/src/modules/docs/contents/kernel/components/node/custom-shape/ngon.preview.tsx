import type { IRPosition, PathCommand } from '@retikz/core';
import { DEFAULT_EPSILON, defineShape, localToWorld, worldToLocal } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';
import { z } from 'zod';

type Position = IRPosition;

const ngonVertices = (radius: number, sides: number): Array<Position> =>
  Array.from({ length: sides }, (_, index) => {
    const angle = ((2 * Math.PI) / sides) * index - Math.PI / 2;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  });

const cross = (a: Position, b: Position): number => a[0] * b[1] - a[1] * b[0];

const findNgonBoundaryPoint = (radius: number, sides: number, direction: Position): Position => {
  const length = Math.hypot(direction[0], direction[1]);
  const ray: Position = length === 0 ? [0, -1] : [direction[0] / length, direction[1] / length];
  const vertices = ngonVertices(radius, sides);
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < vertices.length; index++) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];
    const edge: Position = [end[0] - start[0], end[1] - start[1]];
    const denominator = cross(ray, edge);
    if (Math.abs(denominator) < DEFAULT_EPSILON) continue;

    const distance = cross(start, edge) / denominator;
    const edgeRatio = cross(start, ray) / denominator;
    if (distance >= -DEFAULT_EPSILON && edgeRatio >= -DEFAULT_EPSILON && edgeRatio <= 1 + DEFAULT_EPSILON) {
      nearestDistance = Math.min(nearestDistance, distance);
    }
  }

  const distance = Number.isFinite(nearestDistance) ? nearestDistance : radius;
  return [ray[0] * distance, ray[1] * distance];
};

const ngon = defineShape({
  name: 'ngon',
  paramsSchema: z.strictObject({
    sides: z.number().int().min(3).describe('Number of sides of the regular polygon (>= 3).'),
  }),
  circumscribe: (hw, hh, params) => {
    const corners: Array<Position> = [
      [hw, hh],
      [hw, -hh],
      [-hw, hh],
      [-hw, -hh],
    ];
    const halfAxis = corners.reduce((radius, corner) => {
      const unitBoundary = findNgonBoundaryPoint(1, params.sides, corner);
      const scale = Math.hypot(corner[0], corner[1]) / Math.hypot(unitBoundary[0], unitBoundary[1]);
      return Math.max(radius, scale);
    }, 1);
    return { halfWidth: halfAxis, halfHeight: halfAxis };
  },
  boundaryPoint: (rect, toward, params) => {
    const localToward = worldToLocal(rect, toward);
    const boundary = findNgonBoundaryPoint(rect.width / 2, params.sides, localToward);
    return localToWorld(rect, boundary);
  },
  anchor: (_rect, _name, params) => {
    void params;
    return undefined;
  },
  *emit(rect, style, round, params) {
    const vertices = ngonVertices(rect.width / 2, params.sides);
    const commands: Array<PathCommand> = vertices.map((vertex, index) => {
      const to: Position = [round(rect.x + vertex[0]), round(rect.y + vertex[1])];
      return index === 0 ? { kind: 'move', to } : { kind: 'line', to };
    });
    commands.push({ kind: 'close' });
    yield {
      type: 'path',
      commands,
      fill: style.fill ?? 'transparent',
      fillOpacity: style.fillOpacity,
      stroke: style.stroke ?? 'currentColor',
      strokeOpacity: style.strokeOpacity,
      strokeWidth: style.strokeWidth ?? 1,
      dashPattern: style.dashPattern,
      dashOffset: style.dashOffset,
      opacity: style.opacity,
    };
  },
  // sides 是计数、不随 scale 缩——原样返回 params，scale 只放大节点尺寸而不改边数。
  scaleParams: params => params,
});

/** 图形参数 */
export type NgonPreviewValues = {
  sides: number;
  scale: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

/** 绘制示例图形 */
export const NgonPreview = (values: NgonPreviewValues) => {
  return (
    <Layout viewBox={{ x: -230, y: -125, width: 460, height: 250 }} extensions={{ shapes: [ngon] }}>
      <Node
        id="source"
        position={[-155, 0]}
        shape="circle"
        style={{ fill: 'gray', stroke: 'none' }}
        layout={{ minimumSize: 18 }}
      />
      <Node
        id="shape"
        shape={{ type: 'ngon', params: { sides: values.sides } }}
        position={[0, 0]}
        text={String(values.sides)}
        scale={values.scale}
        style={{ fill: values.fill, stroke: values.stroke, strokeWidth: values.strokeWidth }}
        layout={{ padding: 12 }}
      />
      <Node
        id="sink"
        position={[155, 0]}
        shape="circle"
        style={{ fill: 'gray', stroke: 'none' }}
        layout={{ minimumSize: 18 }}
      />
      <Draw way={['source', 'shape', 'sink']} arrow="->" style={{ stroke: 'gray' }} />
    </Layout>
  );
};
