import { PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { jitterOperationOf } from './point-jitter.controls';
import { jitterPoints } from './point-jitter.data';

/** 图形参数 */
export type PointJitterPreviewValues = {
  'point-jitter-coordinate': 'cartesian2D' | 'polar2D';
  'point-jitter-span-kind': 'range' | 'ratio';
  'point-jitter-ratio': number;
  'point-jitter-range': number;
  'point-jitter-distribution': 'uniform' | 'normal';
  'point-jitter-sigma': number;
  'point-jitter-seed': number;
};

/** 绘制示例图形 */
export const PointJitterPreview = (values: PointJitterPreviewValues) => {
  const polar = values['point-jitter-coordinate'] === 'polar2D';
  const continuous = polar && values['point-jitter-span-kind'] === 'range';
  return (
    <Layout viewBox={{ x: -40, y: -40, width: 480, height: 360 }}>
      <Plot data={jitterPoints} width={400} height={280} coordinate={polar ? 'polar2D' : undefined}>
        <PointMark
          encodings={{ position: { x: continuous ? 'angle' : 'group', y: 'value' } }}
          properties={{ size: 6, color: '#2563eb', placement: { adjustments: [jitterOperationOf(values)] } }}
        />
        {continuous ? (
          <PlotScale dimension="x" type="linear" domain={[0, 360]} />
        ) : (
          <PlotScale dimension="x" type="point" />
        )}
        <PlotScale dimension="y" type="linear" domainPadding={{ upper: polar ? 28 : 6 }} />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" grid />
      </Plot>
    </Layout>
  );
};
