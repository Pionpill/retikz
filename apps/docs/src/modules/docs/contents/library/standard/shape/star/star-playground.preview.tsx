import { Layout } from '@retikz/react';
import { Circle, Star } from '@retikz/standard-react/shape';

/** 图形参数 */
export type StarPlaygroundPreviewValues = {
  outerRadius: number;
  innerRatio: number;
  points: number;
  rotate: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

/** 绘制示例图形 */
export const renderStarPlaygroundPreview = (values: StarPlaygroundPreviewValues) => {
  const innerRadius = values.outerRadius * values.innerRatio;

  return (
    <Layout viewBox={{ x: -115, y: -100, width: 230, height: 200 }}>
      <Circle
        center={[0, 0]}
        radius={values.outerRadius}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Circle
        center={[0, 0]}
        radius={innerRadius}
        style={{ stroke: 'lightgray', strokeOpacity: 0.45, dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Star
        center={[0, 0]}
        outerRadius={values.outerRadius}
        innerRatio={values.innerRatio}
        points={values.points}
        rotate={values.rotate}
        style={{ fill: values.fill, fillOpacity: 0.72, stroke: values.stroke, strokeWidth: values.strokeWidth }}
      />
    </Layout>
  );
};
