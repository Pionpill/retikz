import type { Position } from '@retikz/math';
import type { FC } from 'react';

import { convexHull } from '@retikz/math';
import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { convexHullPlaygroundControls, previewControlContract } from './convex-hull.controls';

export const previewControls = convexHullPlaygroundControls;

type ConvexHullValues = PreviewControlValuesFor<typeof convexHullPlaygroundControls>;

const PointSets = {
  concave: [
    [-145, 45],
    [-105, -55],
    [-25, -85],
    [85, -65],
    [145, 20],
    [95, 80],
    [-35, 90],
    [-95, 70],
    [-45, -15],
    [25, 35],
    [65, -5],
  ],
  duplicates: [
    [-140, 55],
    [-85, -65],
    [-20, -65],
    [50, -65],
    [135, 45],
    [80, 78],
    [-20, 78],
    [40, 0],
    [40, 0],
    [-20, 0],
  ],
} satisfies Record<ConvexHullValues['pointSet'], Array<Position>>;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const points = PointSets[values.pointSet];
  const hull = convexHull(points);
  const hullPoints = new Set(hull);

  return (
    <Layout
      width={520}
      height={250}
      viewBox={{ x: -180, y: -120, width: 360, height: 250 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Draw way={[...hull, hull[0]]} stroke="darkorange" strokeWidth={2} />
      {points.map((point, index) => (
        <Node
          key={`${point[0]}-${point[1]}-${index}`}
          position={point}
          shape="circle"
          minimumSize={hullPoints.has(point) ? 8 : 6}
          padding={0}
          fill={hullPoints.has(point) ? 'currentColor' : 'gray'}
          stroke="none"
        />
      ))}
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 受控展示输入点集与凸包边界 */
const Demo: FC = controlledPreview.Component;

export default Demo;
