import { PathMark, PlotAxis } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { axisCoordinateBasicsRows } from './axis-coordinate-basics.data';

/** 图形参数 */
export type AxisCoordinateBasicsValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  showX: boolean;
  showY: boolean;
  showGrid: boolean;
  tickCount: number;
};

/** 渲染坐标系基础示例 */
export const renderCoordinateBasics = (values: AxisCoordinateBasicsValues) => {
  const isPolar = values.coordinate === 'polar2D';

  return (
    <Layout viewBox={{ x: 0, y: 0, width: 340, height: 260 }}>
      <Plot data={axisCoordinateBasicsRows} width={340} height={260} coordinate={isPolar ? 'polar2D' : undefined}>
        <PathMark x="dimension" y="value" order="order" closed={isPolar} stroke="#2563eb" />
        {values.showX ? <PlotAxis dimension="x" /> : null}
        {values.showY ? <PlotAxis dimension="y" grid={values.showGrid} ticks={{ count: values.tickCount }} /> : null}
      </Plot>
    </Layout>
  );
};
