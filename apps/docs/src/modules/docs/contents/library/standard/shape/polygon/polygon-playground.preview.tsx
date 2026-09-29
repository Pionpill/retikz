import { Draw, Layout } from '@retikz/react';
import { Circle, Polygon } from '@retikz/standard-react/shape';

/** 图形参数 */
export type PolygonPlaygroundPreviewValues = {
  rotate: number;
  radius: number;
  sides: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

/** 绘制示例图形 */
export const renderPolygonPlaygroundPreview = (values: PolygonPlaygroundPreviewValues) => {
  const angle = (values.rotate * Math.PI) / 180;
  const firstVertex: [number, number] = [values.radius * Math.cos(angle), values.radius * Math.sin(angle)];

  return (
    <Layout viewBox={{ x: -115, y: -100, width: 230, height: 200 }}>
      <Circle
        center={[0, 0]}
        radius={values.radius}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Draw way={[[0, 0], firstVertex]} style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }} />
      <Polygon
        center={[0, 0]}
        radius={values.radius}
        sides={values.sides}
        rotate={values.rotate}
        style={{ fill: values.fill, fillOpacity: 0.65, stroke: values.stroke, strokeWidth: values.strokeWidth }}
      />
    </Layout>
  );
};
