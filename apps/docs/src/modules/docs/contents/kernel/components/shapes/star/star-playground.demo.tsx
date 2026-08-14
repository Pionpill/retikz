import type { FC } from 'react';

import { Circle, Layout, Star } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, starPlaygroundControls } from './star-playground.controls';

export const previewControls = starPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const innerRadius = values.outerRadius * values.innerRatio;

  return (
    <Layout width={400} height={250} viewBox={{ x: -115, y: -100, width: 230, height: 200 }}>
      <Circle center={[0, 0]} radius={values.outerRadius} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" />
      <Circle
        center={[0, 0]}
        radius={innerRadius}
        stroke="lightgray"
        strokeOpacity={0.45}
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Star
        center={[0, 0]}
        outerRadius={values.outerRadius}
        innerRatio={values.innerRatio}
        points={values.points}
        rotate={values.rotate}
        fill={values.fill}
        fillOpacity={0.72}
        stroke={values.stroke}
        strokeWidth={values.strokeWidth}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Star 内外半径、角数与起始角 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
