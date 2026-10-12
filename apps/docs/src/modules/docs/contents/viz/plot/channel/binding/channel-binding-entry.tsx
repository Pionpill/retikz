import { Plot, PlotAxis, BuiltinPlotScale, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

const rows = [
  { gdp: 400, life: 76, region: 'A', population: 8 },
  { gdp: 900, life: 81, region: 'B', population: 16 },
  { gdp: 1600, life: 84, region: 'A', population: 28 },
];

/** 用三个点展示相同的字段绑定 */
const ChannelBindingEntry: FC = () => {
  const dimensions = usePreviewDimensions();

  return (
    <Plot data={rows} width={Math.min(360, (dimensions?.width ?? 424) - 64)} height={220}>
      <BuiltinPlotScale dimension="x" type="linear" domainPadding={{ kind: 'ratio', lower: 0.15, upper: 0.15 }} />
      <BuiltinPlotScale dimension="y" type="linear" domainPadding={{ kind: 'ratio', lower: 0.15, upper: 0.15 }} />
      <PointMark x="gdp" y="life" color="region" size="population" />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" />
    </Plot>
  );
};

export default ChannelBindingEntry;
