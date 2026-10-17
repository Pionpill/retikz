import { PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { rows } from './point-auto-padding.data';

/** 自动留白示例 */
export type PointAutoPaddingValues = {
  strategy: 'max-radius' | 'point-aware' | 'off';
  clearance: number;
  override: 'automatic' | 'zero' | 'lower';
};

/** 自动留白示例 */
export const PointAutoPaddingPreview = (values: PointAutoPaddingValues) => (
  <Layout viewBox={{ x: -40, y: -40, width: 480, height: 360 }}>
    <Plot data={rows} width={400} height={280}>
      <PlotScale
        dimension="x"
        type="linear"
        domainPadding={values.override === 'zero' ? 0 : values.override === 'lower' ? { lower: 0 } : undefined}
      />
      <PointMark
        x="x"
        y="y"
        size="value"
        autoPadding={values.strategy === 'off' ? false : { kind: values.strategy, clearance: values.clearance }}
        opacity={0.6}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  </Layout>
);
