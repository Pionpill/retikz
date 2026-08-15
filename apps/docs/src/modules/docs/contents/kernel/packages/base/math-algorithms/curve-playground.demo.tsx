import type { Position } from '@retikz/math';
import type { FC } from 'react';

import { curve } from '@retikz/math';
import { Circle, Draw, Layout, Path, Step } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { curvePlaygroundControls, previewControlContract } from './curve-playground.controls';

export const previewControls = curvePlaygroundControls;

type CurveValues = PreviewControlValuesFor<typeof curvePlaygroundControls>;

const PointSets = {
  uneven: [
    [-145, 55],
    [-105, -50],
    [-25, 15],
    [20, -65],
    [145, 45],
  ],
  zigzag: [
    [-145, 50],
    [-80, -55],
    [-10, 55],
    [60, -55],
    [145, 50],
  ],
  coincident: [
    [-145, 45],
    [-60, -45],
    [-60, -45],
    [35, 45],
    [145, -35],
  ],
} satisfies Record<CurveValues['pointSet'], Array<Position>>;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const points = PointSets[values.pointSet];
  const segments = curve.catmullRomToCubic(points, values.tension);

  return (
    <Layout width={400} height={260} viewBox={{ x: -175, y: -120, width: 350, height: 240 }}>
      <Draw way={points} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" />
      <Path stroke="darkorange" strokeWidth={2}>
        <Step kind="move" to={points[0]} />
        {segments.map((segment, index) => (
          <Step key={index} kind="cubic" to={segment.to} control1={segment.control1} control2={segment.control2} />
        ))}
      </Path>
      {points.map((point, index) => (
        <Circle key={`${point[0]}-${point[1]}-${index}`} center={point} radius={4} fill="dodgerblue" stroke="none" />
      ))}
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 直接渲染 math 返回的 CubicSegment，并保留 knot 折线作为参照 */
const Demo: FC = controlledPreview.Component;

export default Demo;
