import type { FC } from 'react';

import { BuiltinShape } from '@retikz/core';
import { DataFieldType } from '@retikz/data';
import { Plot, PlotAxis, PlotLegend, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { channelBindingControls, previewControlContract } from './channel-binding.controls';
import { cities } from './channel-binding.data';

/** 注册回退使用的通道绑定 controls */
export const previewControls = channelBindingControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
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
    style={{ maxWidth: '100%', height: 'auto' }}
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
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 可切换字段与常量来源的通道绑定 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
