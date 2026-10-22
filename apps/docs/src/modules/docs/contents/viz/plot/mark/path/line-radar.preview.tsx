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
      position={[10, 10]}
    >
      <PathMark
        encodings={{ order: 'rank', position: { x: { field: 'dim' }, y: { field: 'score' } } }}
        properties={{ closed: true }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
    <Plot
      data={team}
      width={280}
      height={280}
      coordinate={{ type: 'polar2D', interpolation: values.rightCoordinateInterpolation }}
      position={[330, 10]}
    >
      <PathMark
        encodings={{ order: 'rank', position: { x: { field: 'dim' }, y: { field: 'score' } } }}
        properties={{ closed: values.closed }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  </Layout>
);
