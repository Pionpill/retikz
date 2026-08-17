import type { Position } from '@retikz/math';
import type { FC } from 'react';

import { convexHull, polygon } from '@retikz/math';
import { Circle, Draw, Layout } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { polygonContainmentControls, previewControlContract } from './polygon-containment.controls';

export const previewControls = polygonContainmentControls;

type PolygonValues = PreviewControlValuesFor<typeof polygonContainmentControls>;

const PolygonSets: Record<PolygonValues['shape'], Array<Position>> = {
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
const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const vertices = PolygonSets[values.shape];
  const hull = convexHull(vertices);
  const testPoints: Array<Position> = [values.testPointA, values.testPointB, values.testPointC];

  return (
    <Layout width={400} height={260} viewBox={{ x: -175, y: -115, width: 350, height: 230 }}>
      <Draw way={[...vertices, vertices[0]]} stroke="lightgray" strokeWidth={2} />
      <Draw way={[...hull, hull[0]]} stroke="darkorange" strokeWidth={2} />
      {testPoints.map((point, index) => (
        <Circle
          key={`test-point-${index}`}
          center={point}
          radius={6}
          fill={polygon.containsPoint(vertices, point) ? 'seagreen' : 'crimson'}
          stroke="none"
        />
      ))}
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 受控展示多个可移动测试点、多边形包含判断与凸包 */
const Demo: FC = controlledPreview.Component;

export default Demo;
