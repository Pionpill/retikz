import { PlotAxis, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { points } from './point-api.data';

/** 图形参数 */
export type PointPositionPreviewValues = {
  /** 最小尺寸 */
  minimumSize: number;
  coordinate: 'cartesian2D' | 'polar2D';
  xField: 'x' | 'y' | 'pop';
  yField: 'x' | 'y' | 'pop';
  colorMode: 'none' | 'region';
  sizeMode: 'fixed' | 'population' | 'minimum';
};

/** 绘制示例图形 */
export const PointPositionPreview = (values: PointPositionPreviewValues) => (
  <Layout viewBox={{ x: -40, y: -40, width: 480, height: 360 }}>
    <Plot data={points} width={400} height={280} coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}>
      <PointMark
        encodings={{
          ...(values.colorMode === 'region' ? { color: 'region' } : {}),
          ...(values.sizeMode === 'minimum' ? {} : { size: values.sizeMode === 'population' ? 'pop' : undefined }),
          position: { x: values.xField, y: values.yField },
        }}
        properties={{
          size: values.sizeMode === 'minimum' ? undefined : values.sizeMode === 'population' ? undefined : 10,
          minimumSize: values.sizeMode === 'minimum' ? values.minimumSize : undefined,
        }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  </Layout>
);
