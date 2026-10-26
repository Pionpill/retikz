import { PlotAxis, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { points } from './point-api.data';

/** 图形参数 */
export type PointPositionPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  xField: 'x' | 'y' | 'pop';
  yField: 'x' | 'y' | 'pop';
};

/** 绘制示例图形 */
export const PointPositionPreview = (values: PointPositionPreviewValues) => (
  <Layout viewBox={{ x: -40, y: -40, width: 480, height: 360 }}>
    <Plot data={points} width={400} height={280} coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}>
      <PointMark
        encodings={{
          position: { x: { field: values.xField }, y: { field: values.yField } },
        }}
        properties={{ size: 10 }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  </Layout>
);
