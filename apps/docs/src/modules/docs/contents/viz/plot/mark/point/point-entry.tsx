import { Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { previewControlContract } from './point-entry.controls';
import { rows } from './point-entry.data';

/** 数据表的显式注册回退 */
export const previewControls = previewControlContract.controls;

/** 用三个点展示相同的字段绑定 */
const PointEntry: FC = () => {
  const dimensions = usePreviewDimensions();

  return (
    <Plot data={rows} width={Math.min(360, (dimensions?.width ?? 424) - 64)} height={220}>
      <PlotScale dimension="x" type="linear" domainPadding={{ kind: 'ratio', lower: 0.15, upper: 0.15 }} />
      <PlotScale dimension="y" type="linear" domainPadding={{ kind: 'ratio', lower: 0.15, upper: 0.15 }} />
      <PointMark x="gdp" y="life" size={6} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" />
    </Plot>
  );
};

export default PointEntry;
