import { BuiltinShape } from '@retikz/core';
import { DataFieldType } from '@retikz/data';
import { Plot, PlotAxis, PlotLegend, PointMark } from '@retikz/plot-react';

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
    <PointMark
      x={values.xField}
      y={values.yField}
      color={values.colorSource === 'field' ? 'region' : { kind: 'constant', value: '#2563eb' }}
      size={values.sizeSource === 'field' ? 'population' : 12}
      shape={values.shapeSource === 'field' ? 'region' : { kind: 'constant', value: BuiltinShape.Circle }}
      label={values.showLabel ? 'abbr' : undefined}
      labelPosition="top"
    />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
    {values.colorSource === 'field' ? <PlotLegend channel="color" position="bottom" /> : null}
    {values.sizeSource === 'field' ? <PlotLegend channel="size" position="right" /> : null}
  </Plot>
);
