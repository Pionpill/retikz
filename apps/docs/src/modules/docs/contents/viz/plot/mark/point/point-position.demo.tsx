import type { FC } from 'react';

import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_POSITION_CONTROL_IDS, previewControlContract } from './point-position.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={points}
    width={400}
    height={280}
    coordinate={values[POINT_POSITION_CONTROL_IDS.coordinate] === 'polar2D' ? 'polar2D' : undefined}
  >
    <PointMark
      x={values[POINT_POSITION_CONTROL_IDS.xField]}
      y={values[POINT_POSITION_CONTROL_IDS.yField]}
      color={values[POINT_POSITION_CONTROL_IDS.colorMode] === 'region' ? 'region' : undefined}
      size={values[POINT_POSITION_CONTROL_IDS.sizeMode] === 'population' ? 'pop' : 10}
    />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 使用 x / y 位置通道绘制基础散点 */
const Demo: FC = controlledPreview.Component;

export default Demo;
