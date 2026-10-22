import { IntervalMark, Plot, PlotAxis, PlotScale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { annotationX, annotationXScale } from '../shared/reference-coordinate';
import type { AnnotationCoordinate } from '../shared/reference-coordinate';

/** 标注试验场参数 */
export type AnnotationIntervalValues = {
  coordinate: AnnotationCoordinate;
  connection: 'coordinate' | 'straight';
  startCategory: string;
  endCategory: string;
  from: number;
  to: number;
  fullHeight: boolean;
  opacity: number;
  showLabel: boolean;
  labelPosition: 'top' | 'center' | 'bottom';
};
/** 常量几何及其标签的可交互预览 */
export const AnnotationIntervalPreview: FC<AnnotationIntervalValues> = values => (
  <Layout viewBox={{ x: -50, y: -55, width: 420, height: 350 }}>
    <Plot data={[]} width={320} height={240} coordinate={values.coordinate === 'cartesian' ? undefined : 'polar2D'}>
      <PlotScale dimension="x" {...annotationXScale(values.coordinate)} />
      <PlotScale dimension="y" type="linear" domain={[0, 100]} domainPadding={0} />
      <IntervalMark
        contributeToDomain={false}
        encodings={{
          bounds: {
            x: {
              from: { value: annotationX(values.coordinate, values.from, values.startCategory) },
              to: { value: annotationX(values.coordinate, values.to, values.endCategory) },
            },
            y: values.fullHeight
              ? { from: { edge: 'start' }, to: { edge: 'end' } }
              : { from: { value: 25 }, to: { value: 75 } },
          },
        }}
        properties={{
          connection: values.connection,
          fill: 'dodgerblue',
          opacity: { overall: values.opacity },
          stroke: 'dodgerblue',
          strokeWidth: 1,
          label: values.showLabel ? { content: 'A', position: values.labelPosition, distance: 8 } : undefined,
          bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } },
        }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" />
    </Plot>
  </Layout>
);
