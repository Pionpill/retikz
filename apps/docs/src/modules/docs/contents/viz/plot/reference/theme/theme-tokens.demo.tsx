import { PlotStyleToken } from '@retikz/plot';
import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

const points = [
  { x: 1, y: 2, series: 'A' },
  { x: 2, y: 4, series: 'A' },
  { x: 3, y: 3, series: 'A' },
  { x: 1, y: 3, series: 'B' },
  { x: 2, y: 2, series: 'B' },
  { x: 3, y: 5, series: 'B' },
];

/** Plot token override 经正式 theme resolver 进入 axis、palette 与 surface */
export default function ThemeTokensDemo() {
  return (
    <Plot
      data={points}
      width={440}
      height={270}
      style={{ maxWidth: '100%', height: 'auto' }}
      styleTokens={{
        [PlotStyleToken.PlotSurfaceFill]: '#F8FAFC',
        [PlotStyleToken.AxisGridStroke]: '#60A5FA',
        [PlotStyleToken.AxisGridDrawOpacity]: 0.35,
        [PlotStyleToken.PlotPaletteCategorical]: ['#2563EB', '#F97316'],
      }}
    >
      <PointMark x="x" y="y" color="series" size={8} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
      <Legend channel="color" />
    </Plot>
  );
}
