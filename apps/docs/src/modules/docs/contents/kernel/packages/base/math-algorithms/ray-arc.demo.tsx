import type { FC } from 'react';

import { arcEndPoint, rayArc } from '@retikz/math';
import { Circle, Draw, Layout, Path, Step } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, rayArcPlaygroundControls } from './ray-arc.controls';

export const previewControls = rayArcPlaygroundControls;

type RayArcValues = PreviewControlValuesFor<typeof rayArcPlaygroundControls>;

const CENTER: [number, number] = [0, 0];
const RADIUS = 82;
const ORIGIN: [number, number] = [-165, 0];
const DIR: [number, number] = [1, 0];

const controlledPreview = defineControlledPreview(previewControlContract, (values: RayArcValues) => {
  const parameters = rayArc({
    origin: ORIGIN,
    dir: DIR,
    center: CENTER,
    radius: RADIUS,
    startAngleDeg: values.startAngle,
    endAngleDeg: values.endAngle,
  });

  return (
    <Layout width={400} height={240} viewBox={{ x: -185, y: -110, width: 370, height: 220 }}>
      <Circle center={CENTER} radius={RADIUS} stroke="lightgray" dashPattern={[4, 3]} fill="none" />
      <Path stroke="darkorange" strokeWidth={2}>
        <Step kind="move" to={arcEndPoint(CENTER, RADIUS, values.startAngle)} />
        <Step kind="arc" center={CENTER} radius={RADIUS} startAngle={values.startAngle} endAngle={values.endAngle} />
      </Path>
      <Draw way={[ORIGIN, [170, 0]]} stroke="dodgerblue" strokeWidth={2} arrow="->" />
      {parameters.map(parameter => (
        <Circle
          key={parameter}
          center={[ORIGIN[0] + DIR[0] * parameter, ORIGIN[1] + DIR[1] * parameter]}
          radius={5}
          fill="darkviolet"
          stroke="none"
        />
      ))}
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 受控展示射线与圆弧的交点 */
const Demo: FC = controlledPreview.Component;

export default Demo;
