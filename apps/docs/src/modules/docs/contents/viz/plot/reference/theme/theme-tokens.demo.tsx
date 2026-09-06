import { PlotAxis, PlotLegend, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

const points = [
  { x: 1, y: 2, series: 'A' },
  { x: 2, y: 4, series: 'A' },
  { x: 3, y: 3, series: 'A' },
  { x: 1, y: 3, series: 'B' },
  { x: 2, y: 2, series: 'B' },
  { x: 3, y: 5, series: 'B' },
];

/** Plot defaults 通过 IRPlot 局部 defaults cascade 进入 Plot area、axis 与 palette */
const plotDefaults = {
  typography: { textColor: '#2563EB' },
  plotArea: { fill: 0.08 },
  palette: { categorical: ['#2563EB', '#F97316'] },
  axis: { grid: false as const },
};

/** PlotAxis rule 只覆盖已经存在且 dimension 匹配的 PlotAxis */
const plotRules = [
  {
    select: { dimension: 'y' },
    axis: { grid: { stroke: 0.25, strokeWidth: 1, drawOpacity: 0.35, includeDomain: true } },
  },
];

/** Plot defaults 通过当前 Plot resolver 进入同一张图表 */
export default function ThemeTokensDemo() {
  return (
    <Layout>
      <Plot data={points} width={440} height={270} plotDefaults={plotDefaults} plotRules={plotRules}>
        <PointMark x="x" y="y" color="series" size={8} />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" />
        <PlotLegend channel="color" />
      </Plot>
    </Layout>
  );
}
