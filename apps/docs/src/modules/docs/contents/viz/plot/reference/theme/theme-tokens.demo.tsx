import { PlotThemeToken } from '@retikz/plot';
import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

const points = [
  { x: 1, y: 2, series: 'A' },
  { x: 2, y: 4, series: 'A' },
  { x: 3, y: 3, series: 'A' },
  { x: 1, y: 3, series: 'B' },
  { x: 2, y: 2, series: 'B' },
  { x: 3, y: 5, series: 'B' },
];

/** Plot token override 通过 PlotSpec 局部 theme cascade 进入 surface、axis 与 palette */
const plotThemeTokens = {
  [PlotThemeToken.PlotSurfaceFill]: '#F8FAFC',
  [PlotThemeToken.PlotPaletteCategorical]: ['#2563EB', '#F97316'],
  [PlotThemeToken.AxisGridStroke]: '#60A5FA',
  [PlotThemeToken.AxisGridDrawOpacity]: 0.35,
};

/** Plot token override 通过当前 Plot resolver 进入同一张图表 */
export default function ThemeTokensDemo() {
  return (
    <Layout width={440} height={270} style={{ maxWidth: '100%', height: 'auto' }}>
      <Plot data={points} width={440} height={270} plotThemeTokens={plotThemeTokens}>
        <PointMark x="x" y="y" color="series" size={8} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
        <Legend channel="color" />
      </Plot>
    </Layout>
  );
}
