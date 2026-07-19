import type { IRPosition, PathCommand } from '@retikz/core';
import type { FC } from 'react';

import { DEFAULT_EPSILON, defineShape, localToWorld, worldToLocal } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';
import { z } from 'zod';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { ngonControls } from './ngon.controls';

export const previewControls = ngonControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

type Position = IRPosition;

/**
 * 带参正多边形 ngon：参数走 nested params（不是 factory 闭包）
 * @description sides 写进 shape.params 后随 IR 持久化；同一个注册名 'ngon' 按 {type, params}
 *   生成三角 / 五边 / 六边等不同变体。几何泛化自 hexagon demo 的射线交边：顶点均布外接圆，
 *   boundaryPoint 解射线与边的最近正向交点，emit 出 sides 个顶点闭合 path。scaleParams 原样返回，
 *   让 sides 这类计数不被 node scale 缩坏。
 */
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

/** ngon 注册项：sides 走 nested params，单一注册名生成任意边数变体 */
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

/** 参数化 ngon 的 sides 与 Node scale playground */
const Demo: FC = () => {
  const values = usePreviewControls(ngonControls);

  return (
    <Layout width={400} height={250} viewBox={{ x: -230, y: -125, width: 460, height: 250 }} shapes={[ngon]}>
      <Node id="source" position={[-155, 0]} shape="circle" minimumSize={18} fill="gray" stroke="none" />
      <Node
        id="shape"
        shape={{ type: 'ngon', params: { sides: values.sides } }}
        position={[0, 0]}
        text={String(values.sides)}
        scale={values.scale}
        fill={values.fill}
        stroke={values.stroke}
        strokeWidth={values.strokeWidth}
        padding={12}
      />
      <Node id="sink" position={[155, 0]} shape="circle" minimumSize={18} fill="gray" stroke="none" />
      <Draw way={['source', 'shape', 'sink']} arrow="->" stroke="gray" />
    </Layout>
  );
};

export default Demo;
