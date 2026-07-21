import type { FC } from 'react';

import { Circle, Draw, Layout, RegularPolygon } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { polygonPlaygroundControls, previewControlContract } from './polygon-playground.controls';

export const previewControls = polygonPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const angle = (values.rotate * Math.PI) / 180;
  const firstVertex: [number, number] = [values.radius * Math.cos(angle), values.radius * Math.sin(angle)];

  return (
    <Layout width={400} height={250} viewBox={{ x: -115, y: -100, width: 230, height: 200 }}>
      <Circle center={[0, 0]} radius={values.radius} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" />
      <Draw way={[[0, 0], firstVertex]} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" />
      <RegularPolygon
        center={[0, 0]}
        radius={values.radius}
        sides={values.sides}
        rotate={values.rotate}
        fill={values.fill}
        fillOpacity={0.65}
        stroke={values.stroke}
        strokeWidth={values.strokeWidth}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** RegularPolygon 边数、外接圆与起始角 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
