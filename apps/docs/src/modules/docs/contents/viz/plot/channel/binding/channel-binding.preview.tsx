import { BuiltinShape } from '@retikz/core';
import { DataFieldType } from '@retikz/data';
import { Plot, PlotAxis, PlotLegend, PlotScale, PointMark } from '@retikz/plot-react';

import { cities } from './channel-binding.data';

/** 图形参数 */
export type ChannelBindingPreviewValues = {
  xField: 'gdp' | 'life' | 'population';
  yField: 'gdp' | 'life' | 'population';
  colorSource: 'field' | 'constant';
  sizeSource: 'field' | 'constant';
  shapeSource: 'field' | 'constant';
  showLabel: boolean;
};

/** 绘制示例图形 */
export const ChannelBindingPreview = (values: ChannelBindingPreviewValues) => (
  <Plot
    data={cities}
    model={[
      { name: 'gdp', type: DataFieldType.Continuous },
      { name: 'life', type: DataFieldType.Continuous },
      { name: 'population', type: DataFieldType.Continuous },
      { name: 'region', type: DataFieldType.Categorical },
      { name: 'abbr', type: DataFieldType.Categorical },
    ]}
    width={480}
    height={320}
  >
    <PlotScale dimension="x" type="linear" domainPadding={{ kind: 'ratio', lower: 0.15, upper: 0.15 }} />
    <PlotScale dimension="y" type="linear" domainPadding={{ kind: 'ratio', lower: 0.15, upper: 0.3 }} />
    <PointMark
      encodings={{
        position: { x: { field: values.xField }, y: { field: values.yField } },
        ...(values.colorSource === 'field' ? { color: 'region' } : {}),
        ...(values.sizeSource === 'field' ? { size: 'population' } : {}),
        ...(values.shapeSource === 'field' ? { shape: 'region' } : {}),
        ...(values.showLabel ? { label: { content: 'abbr' } } : {}),
      }}
      properties={{
        ...(values.colorSource === 'constant' ? { color: '#2563eb' } : {}),
        ...(values.sizeSource === 'constant' ? { size: 12 } : {}),
        ...(values.shapeSource === 'constant' ? { shape: BuiltinShape.Circle } : {}),
        ...(values.showLabel ? { label: { position: 'top' } } : {}),
      }}
    />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
    {values.colorSource === 'field' ? <PlotLegend channel="color" position="bottom" /> : null}
    {values.sizeSource === 'field' ? <PlotLegend channel="size" position="right" /> : null}
  </Plot>
);
