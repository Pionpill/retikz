import { type PathCommand, type Position, type ShapeDefinition, localToWorld, worldToLocal } from '@retikz/core';
import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 自定义 hexagon shape 注入 demo
 * @description 普通函数返回 ShapeDefinition（factory 模式）：circumscribe 计算能包住内容的外接半径，
 *   boundaryPoint 解真实六边形射线交边，emit 出 6 顶点 path，anchor 只认 center。
 *   <TikZ shapes={{ hexagon }}> 注入；IR 里 <Node shape="hexagon"> 只写字符串名。
 */
const createHexagonVertices = (radius: number): Array<Position> =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  });

const cross = (a: Position, b: Position): number => a[0] * b[1] - a[1] * b[0];

const findHexagonBoundaryPoint = (radius: number, direction: Position): Position => {
  const length = Math.hypot(direction[0], direction[1]);
  const ray: Position = length === 0 ? [0, -1] : [direction[0] / length, direction[1] / length];
  const vertices = createHexagonVertices(radius);
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < vertices.length; index++) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];
    const edge: Position = [end[0] - start[0], end[1] - start[1]];
    const denominator = cross(ray, edge);
    if (Math.abs(denominator) < 1e-9) continue;

    const distance = cross(start, edge) / denominator;
    const edgeRatio = cross(start, ray) / denominator;
    if (distance >= -1e-9 && edgeRatio >= -1e-9 && edgeRatio <= 1 + 1e-9) {
      nearestDistance = Math.min(nearestDistance, distance);
    }
  }

  const distance = Number.isFinite(nearestDistance) ? nearestDistance : radius;
  return [ray[0] * distance, ray[1] * distance];
};

const createHexagon = (): ShapeDefinition => ({
  circumscribe: (hw, hh) => {
    const corners: Array<Position> = [
      [hw, hh],
      [hw, -hh],
      [-hw, hh],
      [-hw, -hh],
    ];
    const halfAxis = corners.reduce((radius, corner) => {
      const unitBoundary = findHexagonBoundaryPoint(1, corner);
      const scale = Math.hypot(corner[0], corner[1]) / Math.hypot(unitBoundary[0], unitBoundary[1]);
      return Math.max(radius, scale);
    }, 1);
    return { halfWidth: halfAxis, halfHeight: halfAxis };
  },
  boundaryPoint: (rect, toward) => {
    const localToward = worldToLocal(rect, toward);
    const boundary = findHexagonBoundaryPoint(rect.width / 2, localToward);
    return localToWorld(rect, boundary);
  },
  anchor: (rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
  *emit(rect, style, round) {
    const vertices = createHexagonVertices(rect.width / 2);
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
      opacity: style.opacity,
    };
  },
});

const hexagon = createHexagon();

const Demo: FC = () => (
  <TikZ width={420} height={180} shapes={{ hexagon }}>
    <Node id="a" shape="hexagon" position={[-90, 0]} text="A" fill="#e0ecff" stroke="#3b5bdb" strokeWidth={2} />
    <Node id="b" shape="hexagon" position={[90, 0]} text="B" fill="#fff0e0" stroke="#e8590c" strokeWidth={2} />
    <Draw way={['a', 'b']} arrow="->" />
  </TikZ>
);

export default Demo;
