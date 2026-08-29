import type { FC } from 'react';

import { DataFieldType } from '@retikz/data';
import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinPositionControls, previewControlContract } from './builtin-position.controls';
import { positionRows } from './builtin-position.data';

/** 注册回退使用的内置位置通道 controls */
export const previewControls = builtinPositionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={positionRows}
    model={[
      { name: 'month', type: DataFieldType.Categorical },
      { name: 'sales', type: DataFieldType.Continuous },
      { name: 'profit', type: DataFieldType.Continuous },
      { name: 'orders', type: DataFieldType.Continuous },
      { name: 'averageOrder', type: DataFieldType.Continuous },
    ]}
    coordinate={{ type: 'cartesian2D' }}
    width={400}
    height={260}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x={values.xField} y={values.yField} size={8} fill="#2563eb" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 可切换横纵轴字段的内置位置通道试验场 */
const Demo: FC = controlledPreview.Component;

export default Demo;
