import type { Position } from '@retikz/math';
import { circle, triangle } from '@retikz/math';
import { Draw, Layout } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';

/** 图形参数 */
export type CircleConstructionsPreviewValues = {
  triangleA: [number, number];
  triangleB: [number, number];
  triangleC: [number, number];
  pointA: [number, number];
  pointB: [number, number];
  pointC: [number, number];
  pointD: [number, number];
  pointE: [number, number];
  scheme: 'circumcircle' | 'incircle' | 'minimalEnclosing';
};

/** 绘制示例图形 */
export const CircleConstructionsPreview = (values: CircleConstructionsPreviewValues) => {
  const vertices: [Position, Position, Position] = [values.triangleA, values.triangleB, values.triangleC];
  const points: Array<Position> = [values.pointA, values.pointB, values.pointC, values.pointD, values.pointE];
  const triangleCircle =
    values.scheme === 'circumcircle'
      ? triangle.circumCircle(...vertices)
      : values.scheme === 'incircle'
        ? triangle.incircle(...vertices)
        : undefined;
  const enclosingCircle = values.scheme === 'minimalEnclosing' ? circle.minimalEnclosing(points) : undefined;
  const isTriangleScheme = values.scheme === 'circumcircle' || values.scheme === 'incircle';

  return (
    <Layout>
      {isTriangleScheme ? (
        <Draw way={[...vertices, vertices[0]]} style={{ stroke: 'darkorange', strokeWidth: 2 }} />
      ) : null}
      {isTriangleScheme
        ? vertices.map((point, index) => (
            <Circle
              key={`triangle-${index}`}
              center={point}
              radius={4}
              style={{ fill: 'darkorange', stroke: 'none' }}
            />
          ))
        : points.map((point, index) => (
            <Circle key={`point-${index}`} center={point} radius={4} style={{ fill: 'darkorange', stroke: 'none' }} />
          ))}
      {triangleCircle && (
        <Circle
          center={triangleCircle.center}
          radius={triangleCircle.radius}
          style={{ stroke: 'dodgerblue', strokeWidth: 2, fill: 'none' }}
        />
      )}
      {enclosingCircle && (
        <Circle
          center={enclosingCircle.center}
          radius={enclosingCircle.radius}
          style={{ stroke: 'dodgerblue', strokeWidth: 2, fill: 'none' }}
        />
      )}
    </Layout>
  );
};
