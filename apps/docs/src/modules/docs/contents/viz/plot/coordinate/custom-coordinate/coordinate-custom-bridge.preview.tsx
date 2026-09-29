import { PlotAxis, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { grid } from './coordinate-custom-bridge.data';
import { bridgeCoordinate } from './coordinate-custom-bridge.definition';

/** 图形参数 */
export type CoordinateCustomBridgePreviewValues = {
  archHeight: number;
};

/** 绘制示例图形 */
export const CoordinateCustomBridgePreview = (values: CoordinateCustomBridgePreviewValues) => (
  <Layout viewBox={{ x: -30, y: -80, width: 480, height: 340 }}>
    <Plot
      data={grid}
      width={420}
      height={220}
      coordinate={{ type: 'bridge', archHeight: values.archHeight }}
      coordinates={[bridgeCoordinate]}
    >
      <PointMark x="x" y="y" />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" />
    </Plot>
  </Layout>
);
