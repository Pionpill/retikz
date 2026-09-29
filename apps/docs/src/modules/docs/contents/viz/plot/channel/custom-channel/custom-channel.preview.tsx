import { Plot, PlotAxis, PlotLegend, PointMark } from '@retikz/plot-react';

import { customChannelPoints } from './custom-channel.data';
import { intensityChannel } from './custom-channel.definition';

/** 图形参数 */
export type CustomChannelPreviewValues = {
  bindingMode: 'field' | 'constant';
  constantIntensity: number;
};

/** 绘制示例图形 */
export const CustomChannelPreview = (values: CustomChannelPreviewValues) => (
  <Plot data={customChannelPoints} channelDefinitions={[intensityChannel]} width={440} height={220}>
    <PointMark
      x="x"
      y="y"
      size={8}
      fill="#2563eb"
      stroke="#1d4ed8"
      channels={{
        intensity: values.bindingMode === 'field' ? 'score' : values.constantIntensity,
      }}
    />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
    {values.bindingMode === 'field' ? <PlotLegend channel="intensity" /> : null}
  </Plot>
);
