import type { FC } from 'react';

import { Arc, Circle, Draw, Layout, Sector } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { arcSectorPlaygroundControls } from './arc-sector-playground.controls';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 返回椭圆在指定角度上的点 */
const ellipsePoint = (
  center: [number, number],
  radiusX: number,
  radiusY: number,
  degrees: number,
): [number, number] => {
  const radians = (degrees * Math.PI) / 180;
  return [center[0] + radiusX * Math.cos(radians), center[1] + radiusY * Math.sin(radians)];
};

/** Arc 与 Sector 共享半径、角度和闭合语义的 playground */
const Demo: FC = () => {
  const values = usePreviewControls(arcSectorPlaygroundControls);
  const arcCenter: [number, number] = [-110, 0];
  const sectorCenter: [number, number] = [110, 0];
  const radius = { x: values.radiusX, y: values.radiusY };
  const innerRadius = values.hollow
    ? { x: values.radiusX * values.innerRatio, y: values.radiusY * values.innerRatio }
    : undefined;

  return (
    <Layout width={460} height={270} viewBox={{ x: -220, y: -120, width: 440, height: 240 }}>
      {[arcCenter, sectorCenter].map((center, index) => (
        <Draw
          key={index}
          way={[
            ellipsePoint(center, values.radiusX, values.radiusY, values.startAngle),
            center,
            ellipsePoint(center, values.radiusX, values.radiusY, values.endAngle),
          ]}
          stroke="lightgray"
          dashPattern={[4, 4]}
        />
      ))}
      <Circle center={arcCenter} radius={3} fill="gray" stroke="none" />
      <Circle center={sectorCenter} radius={3} fill="gray" stroke="none" />
      <Arc
        center={arcCenter}
        radius={radius}
        startAngle={values.startAngle}
        endAngle={values.endAngle}
        close={values.arcClose}
        fill={values.fill}
        fillOpacity={values.arcClose === 'open' ? 0 : 0.55}
        stroke={values.stroke}
        strokeWidth={2.5}
      />
      <Sector
        center={sectorCenter}
        radius={radius}
        innerRadius={innerRadius}
        startAngle={values.startAngle}
        endAngle={values.endAngle}
        fill={values.fill}
        fillOpacity={0.72}
        stroke={values.stroke}
        strokeWidth={2.5}
      />
    </Layout>
  );
};

export default Demo;
