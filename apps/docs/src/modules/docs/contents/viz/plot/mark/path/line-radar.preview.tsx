import { PathMark, PlotAxis } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { team } from './line-radar.data';

/** 图形参数 */
export type LineRadarPreviewValues = {
  leftCoordinateInterpolation: 'chord' | 'polar';
  rightCoordinateInterpolation: 'chord' | 'polar';
  closed: boolean;
};

/** 绘制示例图形 */
export const LineRadarPreview = (values: LineRadarPreviewValues) => (
  <Layout>
    <Plot
      data={team}
      width={280}
      height={280}
      coordinate={{ type: 'polar2D', interpolation: values.leftCoordinateInterpolation }}
      x={10}
      y={10}
    >
      <PathMark x="dim" y="score" order="rank" closed />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
    <Plot
      data={team}
      width={280}
      height={280}
      coordinate={{ type: 'polar2D', interpolation: values.rightCoordinateInterpolation }}
      x={330}
      y={10}
    >
      <PathMark x="dim" y="score" order="rank" closed={values.closed} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  </Layout>
);
