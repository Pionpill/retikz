import { Plot, PlotAxis, PlotScale, PointMark, PlotLegend } from '@retikz/plot-react';
import type { FC } from 'react';

const rows = [
  { gdp: 400, life: 76, region: 'A' },
  { gdp: 900, life: 81, region: 'B' },
  { gdp: 1600, life: 84, region: 'A' },
];
/** 最小辅助组件接入示例 */
const Preview: FC = () => (
  <Plot data={rows} width={360} height={220}>
    <PlotScale dimension="x" type="linear" domainPadding={{ kind: 'ratio', lower: 0.15, upper: 0.15 }} />
    <PlotScale dimension="y" type="linear" domainPadding={{ kind: 'ratio', lower: 0.15, upper: 0.15 }} />
    <PointMark
      encodings={{
        position: { x: { field: 'gdp' }, y: { field: 'life' } },
        color: 'region',
      }}
      properties={{ size: 6 }}
    />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" />
    <PlotLegend channel="color" />
  </Plot>
);
export default Preview;
