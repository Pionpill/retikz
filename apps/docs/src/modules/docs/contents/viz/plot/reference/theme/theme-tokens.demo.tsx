import { composeThemeTokenOverrides, defineCoreThemeTokens } from '@retikz/core';
import { definePlotThemeTokens, PlotThemeToken } from '@retikz/plot';
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

/** Plot token override 经正式 theme resolver 进入 axis、palette 与 surface */
const rootThemeTokens = composeThemeTokenOverrides(
  defineCoreThemeTokens({
    'palette.categorical': ['#2563EB', '#F97316'],
  }),
  definePlotThemeTokens({
    [PlotThemeToken.PlotSurfaceFill]: '#F8FAFC',
  }),
);

const localScopeTokens = composeThemeTokenOverrides(
  definePlotThemeTokens({
    [PlotThemeToken.AxisGridStroke]: '#60A5FA',
  }),
);

/** Plot token override 通过 Core Theme namespace 与 Plot spec 进入同一 resolver */
export default function ThemeTokensDemo() {
  return (
    <Layout
      theme={{ style: 'academic', tokens: rootThemeTokens }}
      width={440}
      height={270}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Plot
        data={points}
        width={440}
        height={270}
        theme={{ tokens: localScopeTokens }}
        plotThemeTokens={{ [PlotThemeToken.AxisGridDrawOpacity]: 0.35 }}
      >
        <PointMark x="x" y="y" color="series" size={8} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
        <Legend channel="color" />
      </Plot>
    </Layout>
  );
}
