import { PathAnnotation, PointAnnotation, Plot, PlotAxis, PlotScale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { annotationX, annotationXScale } from './annotation-coordinate';
import type { AnnotationCoordinate } from './annotation-coordinate';

/** 标注试验场参数 */
export type AnnotationPathValues = {
  coordinate: AnnotationCoordinate;
  category: string;
  connection: 'coordinate' | 'straight';
  end: number;
  showLabel: boolean;
  labelPosition: number;
  sloped: boolean;
  distance: number;
};
/** 常量几何及其标签的可交互预览 */
export const AnnotationPathPreview: FC<AnnotationPathValues> = values => (
  <Layout viewBox={{ x: -50, y: -55, width: 420, height: 350 }}>
    <Plot data={[]} width={320} height={240} coordinate={values.coordinate === 'cartesian' ? undefined : 'polar2D'}>
      <PlotScale dimension="x" {...annotationXScale(values.coordinate)} />
      <PlotScale dimension="y" type="linear" domain={[0, 100]} domainPadding={0} />
      <PathAnnotation
        from={{ x: annotationX(values.coordinate, 10, 'A'), y: 70 }}
        to={{ x: annotationX(values.coordinate, values.end, values.category), y: 70 }}
        connection={values.connection}
        stroke="dodgerblue"
        strokeWidth={3}
        label={
          values.showLabel
            ? {
                text: values.coordinate === 'polar-discrete' ? `A → ${values.category}` : 'A → B',
                position: values.labelPosition,
                sloped: values.sloped,
                distance: values.distance,
              }
            : undefined
        }
      />
      <PointAnnotation x={annotationX(values.coordinate, 10, 'A')} y={70} size={4} fill="darkorange" />
      <PointAnnotation
        x={annotationX(values.coordinate, values.end, values.category)}
        y={70}
        size={4}
        fill="darkorange"
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" />
    </Plot>
  </Layout>
);
