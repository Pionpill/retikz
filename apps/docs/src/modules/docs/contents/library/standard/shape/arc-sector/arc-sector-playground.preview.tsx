import { Draw, Layout } from '@retikz/react';
import { Arc, Circle, Sector } from '@retikz/standard-react/shape';

const ellipsePoint = (
  center: [number, number],
  radiusX: number,
  radiusY: number,
  degrees: number,
): [number, number] => {
  const radians = (degrees * Math.PI) / 180;
  return [center[0] + radiusX * Math.cos(radians), center[1] + radiusY * Math.sin(radians)];
};

/** 图形参数 */
export type ArcSectorPlaygroundPreviewValues = {
  radiusX: number;
  radiusY: number;
  hollow: boolean;
  innerRatio: number;
  startAngle: number;
  endAngle: number;
  arcClose: 'open' | 'chord' | 'sector';
  fill: string;
  stroke: string;
};

/** 绘制示例图形 */
export const renderArcSectorPlaygroundPreview = (values: ArcSectorPlaygroundPreviewValues) => {
  const arcCenter: [number, number] = [-110, 0];
  const sectorCenter: [number, number] = [110, 0];
  const radius = { x: values.radiusX, y: values.radiusY };
  const innerRadius = values.hollow
    ? { x: values.radiusX * values.innerRatio, y: values.radiusY * values.innerRatio }
    : undefined;

  return (
    <Layout viewBox={{ x: -220, y: -120, width: 440, height: 240 }}>
      {[arcCenter, sectorCenter].map((center, index) => (
        <Draw
          key={index}
          way={[
            ellipsePoint(center, values.radiusX, values.radiusY, values.startAngle),
            center,
            ellipsePoint(center, values.radiusX, values.radiusY, values.endAngle),
          ]}
          style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
        />
      ))}
      <Circle center={arcCenter} radius={3} style={{ fill: 'gray', stroke: 'none' }} />
      <Circle center={sectorCenter} radius={3} style={{ fill: 'gray', stroke: 'none' }} />
      <Arc
        center={arcCenter}
        radius={radius}
        startAngle={values.startAngle}
        endAngle={values.endAngle}
        close={values.arcClose}
        style={{
          fill: values.fill,
          fillOpacity: values.arcClose === 'open' ? 0 : 0.55,
          stroke: values.stroke,
          strokeWidth: 2.5,
        }}
      />
      <Sector
        center={sectorCenter}
        radius={radius}
        innerRadius={innerRadius}
        startAngle={values.startAngle}
        endAngle={values.endAngle}
        style={{ fill: values.fill, fillOpacity: 0.72, stroke: values.stroke, strokeWidth: 2.5 }}
      />
    </Layout>
  );
};
