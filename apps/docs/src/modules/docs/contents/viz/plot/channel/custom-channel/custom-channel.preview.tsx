import { Plot, PlotAxis, PlotLegend, PointMark, BuiltinPlotScale } from '@retikz/plot-react';

import { customChannelPoints } from './custom-channel.data';
import { intensityChannel } from './custom-channel.definition';

/** 图形参数 */
export type CustomChannelPreviewValues = {
  /** 按宿主宽度调整绘图区，为轴与图例留出空间 */
  width?: number;
  bindingMode: 'field' | 'constant';
  constantIntensity: number;
};

/** 绘制示例图形 */
export const CustomChannelPreview = (values: CustomChannelPreviewValues) => (
  <Plot data={customChannelPoints} channelDefinitions={[intensityChannel]} width={values.width ?? 440} height={220}>
    <BuiltinPlotScale dimension="x" type="linear" domainPadding={16} />
    <BuiltinPlotScale dimension="y" type="linear" domainPadding={16} />
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
