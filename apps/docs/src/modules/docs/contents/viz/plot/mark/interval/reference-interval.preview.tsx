import { IntervalMark, Plot, PlotAxis, PlotScale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { referenceX, referenceXScale } from '../shared/reference-coordinate';
import type { ReferenceCoordinate } from '../shared/reference-coordinate';

/** 图元位置试验场参数 */
export type ReferenceIntervalValues = {
  coordinate: ReferenceCoordinate;
  connection: 'coordinate' | 'straight';
  startCategory: string;
  endCategory: string;
  from: number;
  to: number;
  fullHeight: boolean;
  fullWidth: boolean;
  opacity: number;
  showLabel: boolean;
  labelPosition: 'top' | 'center' | 'bottom';
};
/** 常量几何及其标签的可交互预览 */
export const ReferenceIntervalPreview: FC<ReferenceIntervalValues> = values => (
  <Layout viewBox={{ x: -50, y: -55, width: 420, height: 350 }}>
    <Plot data={[]} width={320} height={240} coordinate={values.coordinate === 'cartesian' ? undefined : 'polar2D'}>
      <PlotScale dimension="x" {...referenceXScale(values.coordinate)} />
      <PlotScale dimension="y" type="linear" domain={[0, 100]} domainPadding={0} />
      <IntervalMark
        contributeToDomain={false}
        encodings={{
          bounds: {
            x: values.fullWidth
              ? { from: { edge: 'start' }, to: { edge: 'end' } }
              : {
                  from: { value: referenceX(values.coordinate, values.from, values.startCategory) },
                  to: { value: referenceX(values.coordinate, values.to, values.endCategory) },
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
          label: values.showLabel ? { text: 'A', position: values.labelPosition, distance: 8 } : undefined,
          bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } },
        }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" />
    </Plot>
  </Layout>
);
