import type { Position } from '@retikz/math';
import { convexHull, polygon } from '@retikz/math';
import { Draw, Layout } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';

const PolygonSets: Record<PolygonContainmentPreviewValues['shape'], Array<Position>> = {
  concave: [
    [-140, -55],
    [-48, -88],
    [-5, -25],
    [78, -70],
    [142, 5],
    [72, 82],
    [-35, 58],
    [-122, 88],
  ],
  convex: [
    [-140, -55],
    [-48, -88],
    [78, -70],
    [142, 5],
    [72, 82],
    [-122, 88],
  ],
};

/** 图形参数 */
export type PolygonContainmentPreviewValues = {
  shape: 'concave' | 'convex';
  testPointA: [number, number];
  testPointB: [number, number];
  testPointC: [number, number];
};

/** 绘制示例图形 */
export const PolygonContainmentPreview = (values: PolygonContainmentPreviewValues) => {
  const vertices = PolygonSets[values.shape];
  const hull = convexHull(vertices);
  const testPoints: Array<Position> = [values.testPointA, values.testPointB, values.testPointC];

  return (
    <Layout>
      <Draw way={[...vertices, vertices[0]]} style={{ stroke: 'lightgray', strokeWidth: 2 }} />
      <Draw way={[...hull, hull[0]]} style={{ stroke: 'darkorange', strokeWidth: 2 }} />
      {testPoints.map((point, index) => (
        <Circle
          key={`test-point-${index}`}
          center={point}
          radius={6}
          style={{ fill: polygon.containsPoint(vertices, point) ? 'seagreen' : 'crimson', stroke: 'none' }}
        />
      ))}
    </Layout>
  );
};
