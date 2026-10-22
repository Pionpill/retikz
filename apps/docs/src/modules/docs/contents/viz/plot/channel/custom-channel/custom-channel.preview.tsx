import { Plot, PlotAxis, PlotLegend, PointMark, PlotScale } from '@retikz/plot-react';

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
  <Plot
    data={customChannelPoints}
    width={values.width ?? 440}
    height={220}
    definitions={{ channels: [intensityChannel] }}
  >
    <PlotScale dimension="x" type="linear" domainPadding={16} />
    <PlotScale dimension="y" type="linear" domainPadding={16} />
    <PointMark
      encodings={{
        ...(values.bindingMode === 'field' ? { intensity: 'score' } : {}),
        position: { x: { field: 'x' }, y: { field: 'y' } },
      }}
      properties={{
        size: 8,
        fill: '#2563eb',
        stroke: '#1d4ed8',
        opacity:
          values.bindingMode === 'field'
            ? undefined
            : { overall: Math.max(0.3, Math.min(1, values.constantIntensity)) },
      }}
    />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
    {values.bindingMode === 'field' ? <PlotLegend channel="intensity" /> : null}
  </Plot>
);
