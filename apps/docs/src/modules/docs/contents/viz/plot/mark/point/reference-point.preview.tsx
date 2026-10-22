import { PointMark, Plot, PlotAxis, PlotScale } from '@retikz/plot-react';
import type { PointMarkProps } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { annotationX, annotationXScale } from '../shared/reference-coordinate';
import type { AnnotationCoordinate } from '../shared/reference-coordinate';

/** 标注试验场参数 */
export type AnnotationPointValues = {
  coordinate: AnnotationCoordinate;
  category: string;
  orientation: 'screen' | 'x-tangent' | 'x-normal' | 'y-tangent' | 'y-normal';
  preset: 'shape' | 'text';
  fontSize: number;
  x: number;
  y: number;
  shape: 'circle' | 'rectangle';
  size: number;
  showLabel: boolean;
  labelPosition: 'top' | 'right' | 'bottom' | 'left';
  distance: number;
};
/** 常量几何及其标签的可交互预览 */
export const AnnotationPointPreview: FC<AnnotationPointValues> = values => {
  const orientation: NonNullable<PointMarkProps['properties']>['orientation'] =
    values.coordinate === 'cartesian' || values.orientation === 'screen'
      ? { kind: 'screen' }
      : {
          kind: 'coordinate',
          role: values.orientation.startsWith('x') ? 'x' : 'y',
          align: values.orientation.endsWith('tangent') ? 'tangent' : 'normal',
        };
  return (
    <Layout viewBox={{ x: -50, y: -55, width: 420, height: 350 }}>
      <Plot data={[]} width={320} height={240} coordinate={values.coordinate === 'cartesian' ? undefined : 'polar2D'}>
        <PlotScale dimension="x" {...annotationXScale(values.coordinate)} />
        <PlotScale dimension="y" type="linear" domain={[0, 100]} domainPadding={0} />
        {values.preset === 'text' ? (
          <PointMark
            contributeToDomain={false}
            encodings={{
              position: {
                x: { value: annotationX(values.coordinate, values.x, values.category) },
                y: { value: values.y },
              },
            }}
            properties={{ text: 'A', orientation, textColor: 'darkorange', font: { size: values.fontSize } }}
          />
        ) : (
          <PointMark
            contributeToDomain={false}
            encodings={{
              position: {
                x: { value: annotationX(values.coordinate, values.x, values.category) },
                y: { value: values.y },
              },
            }}
            properties={{
              shape: values.shape,
              orientation,
              size: values.size,
              fill: 'darkorange',
              label: values.showLabel
                ? { content: 'A', position: values.labelPosition, distance: values.distance }
                : undefined,
            }}
          />
        )}
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" />
      </Plot>
    </Layout>
  );
};
