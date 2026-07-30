import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_BASIC_CONTROL_IDS, previewControlContract } from './line-basic.controls';
import { revenue } from './line-basic.data';

/** 使用同一组位置通道切换笛卡尔与极坐标投影 */
const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const coordinate = values[LINE_BASIC_CONTROL_IDS.coordinate];
  const xField = values[LINE_BASIC_CONTROL_IDS.xField];
  const yField = values[LINE_BASIC_CONTROL_IDS.yField];
  const x = xField === 'coordinate' ? (coordinate === 'polar2D' ? 'period' : 'month') : xField;
  const order = values[LINE_BASIC_CONTROL_IDS.orderSource] === 'field' ? 'month' : undefined;

  return (
    <Plot data={revenue} width={400} height={280} coordinate={coordinate === 'polar2D' ? 'polar2D' : undefined}>
      <PathMark
        x={x}
        y={yField}
        order={order}
        closed={coordinate === 'polar2D' && values[LINE_BASIC_CONTROL_IDS.closed]}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
